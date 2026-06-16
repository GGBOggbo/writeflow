import { NextResponse } from "next/server";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_email: "邮箱格式不正确。",
  google_sso: "Gmail 邮箱请使用 Google 登录。",
  unsupported_domain: "邮箱注册暂时只支持常见中国大陆邮箱。",
  email_registered: "这个邮箱已经注册，请直接登录。",
  rate_limited: "验证码发送太频繁，请稍后再试。",
  invalid_otp: "验证码无效或已过期。",
  otp_expired: "验证码无效或已过期。",
  too_many_attempts: "验证码错误次数过多，请稍后再试。",
  password_too_short: "密码至少需要 8 位。",
  user_not_found: "这个邮箱还没有注册。",
};

const ERROR_STATUS: Record<string, number> = {
  rate_limited: 429,
  too_many_attempts: 429,
};

export function otpErrorResponse(code: string) {
  return NextResponse.json(
    { error: ERROR_MESSAGES[code] || "操作失败，请稍后重试。" },
    { status: ERROR_STATUS[code] || 400 }
  );
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";

  return request.headers.get("x-real-ip") || "unknown";
}
