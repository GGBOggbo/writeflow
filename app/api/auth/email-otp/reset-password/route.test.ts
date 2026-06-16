import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const serviceMocks = vi.hoisted(() => ({
  resetPasswordWithOtp: vi.fn(),
}));

vi.mock("@/lib/auth-otp-service", () => ({
  resetPasswordWithOtp: serviceMocks.resetPasswordWithOtp,
}));

describe("POST /api/auth/email-otp/reset-password", () => {
  beforeEach(() => {
    serviceMocks.resetPasswordWithOtp.mockReset().mockResolvedValue({ ok: true });
  });

  it("resets a password with an OTP code", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/auth/email-otp/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: "reader@qq.com",
          password: "newpassword123",
          code: "123456",
        }),
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(serviceMocks.resetPasswordWithOtp).toHaveBeenCalledWith({
      email: "reader@qq.com",
      password: "newpassword123",
      code: "123456",
    });
  });

  it("returns a clear missing-user message", async () => {
    serviceMocks.resetPasswordWithOtp.mockResolvedValueOnce({
      ok: false,
      code: "user_not_found",
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/email-otp/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: "missing@qq.com",
          password: "newpassword123",
          code: "123456",
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
