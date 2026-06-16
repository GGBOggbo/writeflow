import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const serviceMocks = vi.hoisted(() => ({
  requestAuthOtp: vi.fn(),
}));

vi.mock("@/lib/auth-otp-service", () => ({
  requestAuthOtp: serviceMocks.requestAuthOtp,
}));

describe("POST /api/auth/email-otp/send", () => {
  beforeEach(() => {
    serviceMocks.requestAuthOtp.mockReset().mockResolvedValue({
      ok: true,
      sent: true,
    });
  });

  it("sends an auth OTP", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/auth/email-otp/send", {
        method: "POST",
        body: JSON.stringify({ email: "reader@qq.com", purpose: "signup" }),
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "203.0.113.1",
        },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, sent: true });
    expect(serviceMocks.requestAuthOtp).toHaveBeenCalledWith({
      email: "reader@qq.com",
      purpose: "signup",
      ip: "203.0.113.1",
    });
  });

  it("maps unsupported providers to a bad request", async () => {
    serviceMocks.requestAuthOtp.mockResolvedValueOnce({
      ok: false,
      code: "unsupported_domain",
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/email-otp/send", {
        method: "POST",
        body: JSON.stringify({ email: "reader@example.com", purpose: "signup" }),
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(response.status).toBe(400);
  });

  it("rate limits frequent OTP requests", async () => {
    serviceMocks.requestAuthOtp.mockResolvedValueOnce({
      ok: false,
      code: "rate_limited",
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/email-otp/send", {
        method: "POST",
        body: JSON.stringify({ email: "reader@qq.com", purpose: "signup" }),
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(response.status).toBe(429);
  });

  it("returns a clear missing-user message for password reset", async () => {
    serviceMocks.requestAuthOtp.mockResolvedValueOnce({
      ok: false,
      code: "user_not_found",
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/email-otp/send", {
        method: "POST",
        body: JSON.stringify({
          email: "missing@qq.com",
          purpose: "password-reset",
        }),
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "这个邮箱还没有注册。",
    });
  });
});
