import { NextResponse } from "next/server";
import { z } from "zod";
import { resetPasswordWithOtp } from "@/lib/auth-otp-service";
import { otpErrorResponse } from "../errors";

const resetPasswordOtpBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = resetPasswordOtpBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "请求参数不正确。" }, { status: 400 });
  }

  const result = await resetPasswordWithOtp(parsed.data);

  if (!result.ok) {
    return otpErrorResponse(result.code);
  }

  return NextResponse.json({ ok: true });
}
