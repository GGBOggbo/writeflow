import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  completeSignupWithOtp,
  requestAuthOtp,
  resetPasswordWithOtp,
} from "./auth-otp-service";
import {
  consumeChallenge,
  createAuthOtpChallenge,
} from "./auth-otp-store";
import {
  createVerifiedCredentialUser,
  setCredentialPasswordAndRevokeSessions,
} from "./auth-users";
import { sendZeaburEmail } from "./email/zeabur";

const storeMocks = vi.hoisted(() => ({
  consumeChallenge: vi.fn(),
  createAuthOtpChallenge: vi.fn(),
  getLatestActiveChallenge: vi.fn(),
  getRecentEmailChallenges: vi.fn(),
  getRecentIpChallenges: vi.fn(),
  incrementChallengeAttempts: vi.fn(),
}));

const userMocks = vi.hoisted(() => ({
  createVerifiedCredentialUser: vi.fn(),
  getAuthUserByEmail: vi.fn(),
  setCredentialPasswordAndRevokeSessions: vi.fn(),
  verifyUserAndSetCredentialPassword: vi.fn(),
}));

const emailMocks = vi.hoisted(() => ({
  sendZeaburEmail: vi.fn(),
}));

vi.mock("./auth-otp-store", () => storeMocks);
vi.mock("./auth-users", () => userMocks);
vi.mock("./email/zeabur", () => ({
  sendZeaburEmail: emailMocks.sendZeaburEmail,
}));

describe("auth OTP service", () => {
  beforeEach(() => {
    vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-that-is-long-enough");
    storeMocks.consumeChallenge.mockReset().mockResolvedValue(undefined);
    storeMocks.createAuthOtpChallenge.mockReset().mockResolvedValue("challenge-1");
    storeMocks.getLatestActiveChallenge.mockReset().mockResolvedValue(null);
    storeMocks.getRecentEmailChallenges.mockReset().mockResolvedValue([]);
    storeMocks.getRecentIpChallenges.mockReset().mockResolvedValue([]);
    storeMocks.incrementChallengeAttempts.mockReset().mockResolvedValue(undefined);
    userMocks.createVerifiedCredentialUser.mockReset().mockResolvedValue({
      id: "user-1",
      email: "reader@qq.com",
      emailVerified: true,
    });
    userMocks.getAuthUserByEmail.mockReset().mockResolvedValue(null);
    userMocks.setCredentialPasswordAndRevokeSessions
      .mockReset()
      .mockResolvedValue(undefined);
    userMocks.verifyUserAndSetCredentialPassword
      .mockReset()
      .mockResolvedValue(undefined);
    emailMocks.sendZeaburEmail.mockReset().mockResolvedValue(undefined);
  });

  it("sends a signup OTP for allowed domestic email providers", async () => {
    const result = await requestAuthOtp({
      email: "Reader@QQ.com",
      purpose: "signup",
      ip: "127.0.0.1",
    });

    expect(result).toEqual({ ok: true, sent: true });
    expect(createAuthOtpChallenge).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "reader@qq.com",
        purpose: "signup",
      })
    );
    expect(sendZeaburEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "reader@qq.com",
        subject: "你的 Writeflow 注册验证码",
      })
    );
  });

  it("rejects Gmail signup because Google SSO should be used", async () => {
    const result = await requestAuthOtp({
      email: "reader@gmail.com",
      purpose: "signup",
      ip: "127.0.0.1",
    });

    expect(result).toEqual({ ok: false, code: "google_sso" });
    expect(sendZeaburEmail).not.toHaveBeenCalled();
  });

  it("blocks signup OTP for already verified accounts", async () => {
    userMocks.getAuthUserByEmail.mockResolvedValueOnce({
      id: "user-1",
      email: "reader@qq.com",
      emailVerified: true,
    });

    const result = await requestAuthOtp({
      email: "reader@qq.com",
      purpose: "signup",
      ip: "127.0.0.1",
    });

    expect(result).toEqual({ ok: false, code: "email_registered" });
    expect(sendZeaburEmail).not.toHaveBeenCalled();
  });

  it("rejects password reset OTP for missing accounts", async () => {
    const result = await requestAuthOtp({
      email: "missing@qq.com",
      purpose: "password-reset",
      ip: "127.0.0.1",
    });

    expect(result).toEqual({ ok: false, code: "user_not_found" });
    expect(sendZeaburEmail).not.toHaveBeenCalled();
  });

  it("creates a verified credential account after signup OTP verification", async () => {
    storeMocks.getLatestActiveChallenge.mockResolvedValueOnce({
      id: "challenge-1",
      email: "reader@qq.com",
      purpose: "signup",
      codeHash:
        "3f6b1395ef8436694aff6d44f54e7775ff9597cc7af8a08bfd6f9479b46f46f5",
      attempts: 0,
      createdAt: new Date("2099-06-16T12:00:00Z"),
      expiresAt: new Date("2099-06-16T12:10:00Z"),
      consumedAt: null,
      lockedUntil: null,
    });

    const result = await completeSignupWithOtp({
      email: "reader@qq.com",
      name: "Reader",
      password: "password123",
      code: "123456",
    });

    expect(result).toEqual({ ok: true });
    expect(createVerifiedCredentialUser).toHaveBeenCalledWith({
      email: "reader@qq.com",
      name: "Reader",
      password: "password123",
    });
    expect(consumeChallenge).toHaveBeenCalledWith("challenge-1");
  });

  it("resets a password after password-reset OTP verification", async () => {
    userMocks.getAuthUserByEmail.mockResolvedValue({
      id: "user-1",
      email: "reader@qq.com",
      emailVerified: true,
    });
    storeMocks.getLatestActiveChallenge.mockResolvedValueOnce({
      id: "challenge-1",
      email: "reader@qq.com",
      purpose: "password-reset",
      codeHash:
        "c529e020307bac6062488e8f6c6fb5d9719d2fad0f605342c3722eeebcffcc22",
      attempts: 0,
      createdAt: new Date("2099-06-16T12:00:00Z"),
      expiresAt: new Date("2099-06-16T12:10:00Z"),
      consumedAt: null,
      lockedUntil: null,
    });

    const result = await resetPasswordWithOtp({
      email: "reader@qq.com",
      password: "newpassword123",
      code: "123456",
    });

    expect(result).toEqual({ ok: true });
    expect(setCredentialPasswordAndRevokeSessions).toHaveBeenCalledWith({
      userId: "user-1",
      password: "newpassword123",
    });
    expect(consumeChallenge).toHaveBeenCalledWith("challenge-1");
  });
});
