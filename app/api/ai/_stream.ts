import { NextResponse } from "next/server";
import { ZodType } from "zod";
import type { WorkflowProgressEvent } from "@/lib/progress/types";
import { auth } from "@/lib/auth";
import {
  CreditConflictError,
  creditStore,
  InsufficientCreditsError,
  type AiStage,
} from "@/lib/credits";
import type { CreditBalance } from "@/types/credits";

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
  let input: TInput;

  try {
    input = schema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "请求参数不合法",
      },
      { status: 400 }
    );
  }

  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "请先登录后再使用。" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    await creditStore.reserve(userId, stage, input.operationId);
  } catch (error) {
    const status =
      error instanceof InsufficientCreditsError
        ? 403
        : error instanceof CreditConflictError
          ? 409
          : 500;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "积分预扣失败。",
      },
      { status }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const result = await handler(input, (event) => {
          write(controller, encoder, { type: "progress", event });
        });

        const balance = await creditStore.consume(userId, input.operationId);
        write(controller, encoder, { type: "credits", balance });
        write(controller, encoder, { type: "result", data: result });
      } catch (error) {
        try {
          await creditStore.refund(userId, input.operationId);
        } catch {
          // Preserve the generation error; operation state remains auditable.
        }
        write(controller, encoder, {
          type: "error",
          error: error instanceof Error ? error.message : "服务生成失败",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
