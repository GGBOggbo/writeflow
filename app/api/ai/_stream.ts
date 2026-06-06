import { NextResponse } from "next/server";
import { ZodType } from "zod";
import type { WorkflowProgressEvent } from "@/lib/progress/types";

type StreamPayload<T> =
  | { type: "progress"; event: WorkflowProgressEvent }
  | { type: "result"; data: T }
  | { type: "error"; error: string };

function write<T>(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  payload: StreamPayload<T>
) {
  controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
}

export async function streamJsonResponse<TInput, TOutput>(
  request: Request,
  schema: ZodType<TInput>,
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

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const result = await handler(input, (event) => {
          write(controller, encoder, { type: "progress", event });
        });
        write(controller, encoder, { type: "result", data: result });
      } catch (error) {
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
