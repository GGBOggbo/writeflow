import { NextResponse } from "next/server";
import { ZodType } from "zod";
import type { WorkflowProgressEvent } from "@/lib/progress/types";
import { auth } from "@/lib/auth";
import { log } from "@/lib/debug";
import {
  CreditConflictError,
  creditStore,
  InsufficientCreditsError,
  type AiStage,
} from "@/lib/credits";
import type { CreditBalance } from "@/types/credits";
import {
  getLogContext,
  runWithExtendedLogContext,
  runWithLogContext,
} from "@/lib/logging/context";
import {
  hashUserId,
  logResponseHeaders,
  withRequestLogContext,
} from "@/lib/logging/request-context";

type StreamPayload<T> =
  | { type: "progress"; event: WorkflowProgressEvent }
  | { type: "credits"; balance: CreditBalance }
  | { type: "result"; data: T }
  | { type: "error"; error: string };

type MeteredInput = {
  operationId: string;
};

function write<T>(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  payload: StreamPayload<T>
) {
  controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
}

export async function streamJsonResponse<
  TInput extends MeteredInput,
  TOutput,
>(
  request: Request,
  schema: ZodType<TInput>,
  stage: AiStage,
  handler: (
    input: TInput,
    emit: (event: WorkflowProgressEvent) => void
  ) => Promise<TOutput>
) {
  return withRequestLogContext(request, async () => {
    const startedAt = Date.now();
    log.info("api", "request started", {
      event: "api.request.started",
      status: "started",
      route: getLogContext()?.route,
      stage,
      stream: true,
    });

    let input: TInput;

    try {
      input = schema.parse(await request.json());
    } catch (error) {
      log.warn("api", "request validation failed", {
        event: "api.request.validation_failed",
        status: "failed",
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "请求参数不合法",
        },
        { status: 400, headers: logResponseHeaders() }
      );
    }

    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      log.warn("api", "request unauthorized", {
        event: "api.request.unauthorized",
        status: "failed",
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "请先登录后再使用。" },
        { status: 401, headers: logResponseHeaders() }
      );
    }

    const userId = session.user.id;

    return runWithExtendedLogContext(
      {
        operationId: input.operationId,
        stage,
        userIdHash: await hashUserId(userId),
      },
      async () => {
        const workflowId = getLogContext()?.workflowId;

        if (!workflowId) {
          return serverErrorResponse(new Error("缺少工作流标识。"));
        }

        try {
          log.info("credits", "reserve started", {
            event: "credits.reserve.started",
            status: "started",
          });
          await creditStore.reserve(userId, stage, input.operationId, workflowId);
          log.info("credits", "reserve succeeded", {
            event: "credits.reserve.succeeded",
            status: "succeeded",
          });
        } catch (error) {
          const status =
            error instanceof InsufficientCreditsError
              ? 403
              : error instanceof CreditConflictError
                ? 409
                : 500;
          log.warn("credits", "reserve failed", {
            event: error instanceof CreditConflictError
              ? "credits.reserve.conflict"
              : "credits.reserve.failed",
            status: "failed",
            httpStatus: status,
          });
          return NextResponse.json(
            {
              error: error instanceof Error ? error.message : "积分预扣失败。",
            },
            { status, headers: logResponseHeaders() }
          );
        }

        const encoder = new TextEncoder();
        const streamContext = getLogContext();
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const run = async () => {
              try {
                const result = await handler(input, (event) => {
                  write(controller, encoder, { type: "progress", event });
                });

                const balance = await creditStore.consume(userId, input.operationId);
                log.info("credits", "consume succeeded", {
                  event: "credits.consume.succeeded",
                  status: "succeeded",
                  remainingCredits: balance.unlimited ? "unlimited" : balance.remaining,
                });
                write(controller, encoder, { type: "credits", balance });
                write(controller, encoder, { type: "result", data: result });
                log.info("api", "request completed", {
                  event: "api.request.completed",
                  status: "succeeded",
                  httpStatus: 200,
                  durationMs: Date.now() - startedAt,
                });
              } catch (error) {
                try {
                  await creditStore.refund(userId, input.operationId);
                  log.info("credits", "refund succeeded", {
                    event: "credits.refund.succeeded",
                    status: "succeeded",
                  });
                } catch {
                  log.warn("credits", "refund failed", {
                    event: "credits.refund.failed",
                    status: "failed",
                  });
                }
                log.error("api", "request failed", error);
                write(controller, encoder, {
                  type: "error",
                  error: error instanceof Error ? error.message : "服务生成失败",
                });
              } finally {
                log.info("api", "stream closed", {
                  event: "api.stream.closed",
                  status: "succeeded",
                  durationMs: Date.now() - startedAt,
                });
                controller.close();
              }
            };

            return streamContext
              ? runWithLogContext(streamContext, run)
              : run();
          },
        });

        return new Response(stream, {
          headers: {
            ...logResponseHeaders(),
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    );
  });
}

export async function authenticatedStreamJsonResponse<
  TInput extends MeteredInput,
  TOutput,
>(
  request: Request,
  schema: ZodType<TInput>,
  stage: AiStage,
  handler: (
    input: TInput,
    emit: (event: WorkflowProgressEvent) => void
  ) => Promise<TOutput>
) {
  return withRequestLogContext(request, async () => {
    const startedAt = Date.now();
    let input: TInput;

    try {
      input = schema.parse(await request.json());
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "请求参数不合法" },
        { status: 400, headers: logResponseHeaders() }
      );
    }

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json(
        { error: "请先登录后再使用。" },
        { status: 401, headers: logResponseHeaders() }
      );
    }

    return runWithExtendedLogContext(
      {
        operationId: input.operationId,
        stage,
        userIdHash: await hashUserId(session.user.id),
      },
      async () => {
        const encoder = new TextEncoder();
        const streamContext = getLogContext();
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const run = async () => {
              try {
                const result = await handler(input, (event) => {
                  write(controller, encoder, { type: "progress", event });
                });
                write(controller, encoder, { type: "result", data: result });
                log.info("api", "free stream completed", {
                  event: "api.free_stream.completed",
                  status: "succeeded",
                  durationMs: Date.now() - startedAt,
                });
              } catch (error) {
                log.error("api", "free stream failed", error);
                write(controller, encoder, {
                  type: "error",
                  error: error instanceof Error ? error.message : "服务生成失败",
                });
              } finally {
                controller.close();
              }
            };

            return streamContext
              ? runWithLogContext(streamContext, run)
              : run();
          },
        });

        return new Response(stream, {
          headers: {
            ...logResponseHeaders(),
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    );
  });
}
