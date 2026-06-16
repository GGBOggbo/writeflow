import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const serviceMocks = vi.hoisted(() => ({
  completeSignupWithOtp: vi.fn(),
}));

vi.mock("@/lib/auth-otp-service", () => ({
  completeSignupWithOtp: serviceMocks.completeSignupWithOtp,
}));

describe("POST /api/auth/email-otp/signup", () => {
  beforeEach(() => {
    serviceMocks.completeSignupWithOtp.mockReset().mockResolvedValue({ ok: true });
  });

  it("completes signup with an OTP code", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/auth/email-otp/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "reader@qq.com",
          name: "Reader",
          password: "password123",
          code: "123456",
        }),
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(serviceMocks.completeSignupWithOtp).toHaveBeenCalledWith({
      email: "reader@qq.com",
      name: "Reader",
      password: "password123",
      code: "123456",
    });
  });

  it("rejects invalid OTP codes", async () => {
    serviceMocks.completeSignupWithOtp.mockResolvedValueOnce({
      ok: false,
      code: "invalid_otp",
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/email-otp/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "reader@qq.com",
          name: "Reader",
          password: "password123",
          code: "000000",
        }),
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(response.status).toBe(400);
  });
});
