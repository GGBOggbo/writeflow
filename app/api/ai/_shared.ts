import { NextResponse } from "next/server";
import { ZodType } from "zod";
import { auth } from "@/lib/auth";
import {
  CreditConflictError,
  creditStore,
  InsufficientCreditsError,
  type AiStage,
} from "@/lib/credits";
import type { CreditBalance } from "@/types/credits";

type MeteredInput = {
  operationId: string;
};

function balanceHeader(balance: CreditBalance) {
  return balance.unlimited ? "unlimited" : String(balance.remaining);
}

function creditErrorResponse(error: unknown) {
  if (error instanceof InsufficientCreditsError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  if (error instanceof CreditConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  return serverErrorResponse(error);
}

export async function meteredJsonResponse<TInput extends MeteredInput, TOutput>(
  request: Request,
  schema: ZodType<TInput>,
  stage: AiStage,
  handler: (input: TInput) => Promise<TOutput>
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
    return creditErrorResponse(error);
  }

  try {
    const result = await handler(input);
    const balance = await creditStore.consume(userId, input.operationId);
    return NextResponse.json(result, {
      headers: {
        "X-Credits-Remaining": balanceHeader(balance),
      },
    });
  } catch (error) {
    try {
      await creditStore.refund(userId, input.operationId);
    } catch {
      // Preserve the generation error; operation state remains auditable.
    }
    return serverErrorResponse(error);
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
