import { NextResponse } from "next/server";
import { z } from "zod";
import { requestAuthOtp } from "@/lib/auth-otp-service";
import { getClientIp, otpErrorResponse } from "../errors";

const sendOtpBodySchema = z.object({
  email: z.string().email(),
  purpose: z.enum(["signup", "password-reset"]),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = sendOtpBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "请求参数不正确。" }, { status: 400 });
  }

  const result = await requestAuthOtp({
    email: parsed.data.email,
    purpose: parsed.data.purpose,
    ip: getClientIp(request),
  });

  if (!result.ok) {
    return otpErrorResponse(result.code);
  }

  return NextResponse.json({ ok: true, sent: result.sent });
}
