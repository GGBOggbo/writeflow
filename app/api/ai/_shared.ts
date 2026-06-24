import { NextResponse } from "next/server";
import { ZodType } from "zod";
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
} from "@/lib/logging/context";
import {
  hashUserId,
  logResponseHeaders,
  withRequestLogContext,
} from "@/lib/logging/request-context";

type MeteredInput = {
  operationId: string;
};

function balanceHeader(balance: CreditBalance) {
  return balance.unlimited ? "unlimited" : String(balance.remaining);
}

function creditErrorResponse(error: unknown) {
  if (error instanceof InsufficientCreditsError) {
    return NextResponse.json(
      { error: error.message },
      { status: 403, headers: logResponseHeaders() }
    );
  }

  if (error instanceof CreditConflictError) {
    return NextResponse.json(
      { error: error.message },
      { status: 409, headers: logResponseHeaders() }
    );
  }

  return serverErrorResponse(error);
}

export async function meteredJsonResponse<TInput extends MeteredInput, TOutput>(
  request: Request,
  schema: ZodType<TInput>,
  stage: AiStage,
  handler: (input: TInput) => Promise<TOutput>
) {
  return withRequestLogContext(request, async () => {
    const startedAt = Date.now();
    log.info("api", "request started", {
      event: "api.request.started",
      status: "started",
      route: getLogContext()?.route,
      stage,
      stream: false,
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
          log.warn("credits", "reserve failed", {
            event: error instanceof CreditConflictError
              ? "credits.reserve.conflict"
              : "credits.reserve.failed",
            status: "failed",
          });
          return creditErrorResponse(error);
        }

        try {
          const result = await handler(input);
          const balance = await creditStore.consume(userId, input.operationId);
          log.info("credits", "consume succeeded", {
            event: "credits.consume.succeeded",
            status: "succeeded",
            remainingCredits: balance.unlimited ? "unlimited" : balance.remaining,
          });
          log.info("api", "request completed", {
            event: "api.request.completed",
            status: "succeeded",
            httpStatus: 200,
            durationMs: Date.now() - startedAt,
          });
          return NextResponse.json(result, {
            headers: {
              ...logResponseHeaders(),
              "X-Credits-Remaining": balanceHeader(balance),
            },
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
          return serverErrorResponse(error);
        }
      }
    );
  });
}

export async function authenticatedJsonResponse<
  TInput extends MeteredInput,
  TOutput,
>(
  request: Request,
  schema: ZodType<TInput>,
  stage: AiStage,
  handler: (input: TInput) => Promise<TOutput>
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
        try {
          const result = await handler(input);
          log.info("api", "free request completed", {
            event: "api.free_request.completed",
            status: "succeeded",
            durationMs: Date.now() - startedAt,
          });
          return NextResponse.json(result, { headers: logResponseHeaders() });
        } catch (error) {
          log.error("api", "free request failed", error);
          return serverErrorResponse(error);
        }
      }
    );
  });
}

export function serverErrorResponse(error: unknown) {
  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : "服务生成失败",
    },
    { status: 500, headers: logResponseHeaders() }
  );
}
