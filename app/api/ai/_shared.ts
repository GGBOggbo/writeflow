import { NextResponse } from "next/server";
import { ZodType } from "zod";

export async function parseRequest<T>(
  request: Request,
  schema: ZodType<T>
): Promise<T | NextResponse> {
  try {
    return schema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "请求参数不合法",
      },
      { status: 400 }
    );
  }
}

export function serverErrorResponse(error: unknown) {
  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : "服务生成失败",
    },
    { status: 500 }
  );
}
