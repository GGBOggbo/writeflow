import { describe, expect, it } from "vitest";
import {
  canSendOtp,
  getEmailSignupPolicy,
  hashOtpCode,
  verifyOtpCodeHash,
} from "./auth-otp";

describe("auth OTP policy", () => {
  it("allows well-known mainland China email providers for email signup", () => {
    expect(getEmailSignupPolicy("reader@qq.com")).toEqual({
      allowed: true,
      normalizedEmail: "reader@qq.com",
      reason: "allowed",
    });
    expect(getEmailSignupPolicy("reader@163.com").allowed).toBe(true);
    expect(getEmailSignupPolicy("reader@foxmail.com").allowed).toBe(true);
  });

  it("routes Gmail addresses to Google SSO instead of email signup", () => {
    expect(getEmailSignupPolicy("reader@gmail.com")).toEqual({
      allowed: false,
      normalizedEmail: "reader@gmail.com",
      reason: "google_sso",
    });
  });

  it("rejects unsupported email providers for email signup", () => {
    expect(getEmailSignupPolicy("reader@example.com")).toEqual({
      allowed: false,
      normalizedEmail: "reader@example.com",
      reason: "unsupported_domain",
    });
  });

  it("enforces resend cooldown and hourly limits", () => {
    const now = new Date("2026-06-16T12:00:00Z");
    const recent = [
      { createdAt: new Date("2026-06-16T11:59:30Z") },
    ];
    const hourly = Array.from({ length: 5 }, (_, index) => ({
      createdAt: new Date(now.getTime() - (index + 2) * 60_000),
    }));

    expect(canSendOtp(recent, [], now).allowed).toBe(false);
    expect(canSendOtp(hourly, [], now).allowed).toBe(false);
    expect(
      canSendOtp([], Array.from({ length: 20 }, () => ({ createdAt: now })), now)
        .allowed
    ).toBe(false);
  });

  it("hashes OTP codes without storing the plain code and verifies with a keyed hash", () => {
    const secret = "test-secret-that-is-long-enough";
    const hash = hashOtpCode({
      email: "reader@qq.com",
      purpose: "signup",
      code: "123456",
      secret,
    });

    expect(hash).not.toContain("123456");
    expect(
      verifyOtpCodeHash({
        email: "reader@qq.com",
        purpose: "signup",
        code: "123456",
        hash,
        secret,
      })
    ).toBe(true);
    expect(
      verifyOtpCodeHash({
        email: "reader@qq.com",
        purpose: "signup",
        code: "000000",
        hash,
        secret,
      })
    ).toBe(false);
  });
});
