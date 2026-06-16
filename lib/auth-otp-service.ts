import { createHmac } from "node:crypto";
import {
  OTP_EXPIRES_MS,
  OTP_LOCK_MS,
  OTP_MAX_ATTEMPTS,
  canSendOtp,
  generateOtpCode,
  getEmailSignupPolicy,
  hashOtpCode,
  verifyOtpCodeHash,
  type AuthOtpPurpose,
} from "./auth-otp";
import {
  consumeChallenge,
  createAuthOtpChallenge,
  getLatestActiveChallenge,
  getRecentEmailChallenges,
  getRecentIpChallenges,
  incrementChallengeAttempts,
} from "./auth-otp-store";
import {
  createVerifiedCredentialUser,
  getAuthUserByEmail,
  setCredentialPasswordAndRevokeSessions,
  verifyUserAndSetCredentialPassword,
} from "./auth-users";
import { sendZeaburEmail } from "./email/zeabur";

type RequestAuthOtpResult =
  | { ok: true; sent: boolean }
  | {
      ok: false;
      code:
        | "invalid_email"
        | "google_sso"
        | "unsupported_domain"
        | "email_registered"
        | "user_not_found"
        | "rate_limited";
    };

type CompleteOtpResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "invalid_email"
        | "invalid_otp"
        | "otp_expired"
        | "too_many_attempts"
        | "email_registered"
        | "password_too_short"
        | "user_not_found";
    };

function getOtpSecret() {
  return (
    process.env.AUTH_OTP_SECRET ||
    process.env.BETTER_AUTH_SECRET ||
    process.env.AUTH_SECRET ||
    "better-auth-secret-12345678901234567890"
  );
}

function getIpHash(ip: string) {
  return createHmac("sha256", getOtpSecret()).update(ip || "unknown").digest("hex");
}

function getOtpEmailContent({
  purpose,
  code,
}: {
  purpose: AuthOtpPurpose;
  code: string;
}) {
  const title = purpose === "signup" ? "注册验证码" : "重置密码验证码";
  const action = purpose === "signup" ? "完成注册" : "重置密码";
  const subject =
    purpose === "signup"
      ? "你的 Writeflow 注册验证码"
      : "你的 Writeflow 重置密码验证码";
  const text = `你的 Writeflow ${title}是：${code}\n\n验证码 10 分钟内有效，请勿转发给任何人。`;
  const html = `
    <div style="margin:0;padding:32px;background:#f3f5f7;color:#233044;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Microsoft YaHei UI',sans-serif;">
      <div style="max-width:520px;margin:0 auto;border:1px solid rgba(35,48,68,0.12);border-radius:24px;background:#ffffff;padding:28px;box-shadow:0 18px 40px rgba(31,42,55,0.06);">
        <p style="margin:0 0 12px;color:#5f7993;font-size:12px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;">WRITEFLOW</p>
        <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:#233044;">${title}</h1>
        <p style="margin:0 0 18px;color:#56616d;font-size:15px;line-height:1.75;">请输入下面的验证码${action}。</p>
        <p style="margin:0;border-radius:18px;background:#f3f5f7;padding:18px 20px;text-align:center;color:#233044;font-size:32px;font-weight:800;letter-spacing:0.22em;">${code}</p>
        <p style="margin:18px 0 0;color:#8a96a3;font-size:12px;line-height:1.6;">验证码 10 分钟内有效。不要把验证码转发给任何人；Writeflow 不会向你索要验证码。</p>
      </div>
    </div>
  `;

  return { subject, text, html };
}

function validatePassword(password: string) {
  return password.length >= 8;
}

async function verifyAuthOtp({
  email,
  purpose,
  code,
}: {
  email: string;
  purpose: AuthOtpPurpose;
  code: string;
}): Promise<CompleteOtpResult> {
  const challenge = await getLatestActiveChallenge({ email, purpose });
  const now = new Date();

  if (!challenge) return { ok: false, code: "invalid_otp" };
  if (challenge.lockedUntil && challenge.lockedUntil > now) {
    return { ok: false, code: "too_many_attempts" };
  }
  if (challenge.expiresAt < now) {
    return { ok: false, code: "otp_expired" };
  }
  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    await incrementChallengeAttempts({
      id: challenge.id,
      lockedUntil: new Date(now.getTime() + OTP_LOCK_MS),
    });
    return { ok: false, code: "too_many_attempts" };
  }

  const matched = verifyOtpCodeHash({
    email,
    purpose,
    code,
    hash: challenge.codeHash,
    secret: getOtpSecret(),
  });

  if (!matched) {
    const nextAttempts = challenge.attempts + 1;
    await incrementChallengeAttempts({
      id: challenge.id,
      lockedUntil:
        nextAttempts >= OTP_MAX_ATTEMPTS
          ? new Date(now.getTime() + OTP_LOCK_MS)
          : undefined,
    });
    return {
      ok: false,
      code: nextAttempts >= OTP_MAX_ATTEMPTS ? "too_many_attempts" : "invalid_otp",
    };
  }

  await consumeChallenge(challenge.id);
  return { ok: true };
}

export async function requestAuthOtp({
  email,
  purpose,
  ip,
}: {
  email: string;
  purpose: AuthOtpPurpose;
  ip: string;
}): Promise<RequestAuthOtpResult> {
  const policy = getEmailSignupPolicy(email);

  if (!policy.allowed) {
    return { ok: false, code: policy.reason };
  }

  const normalizedEmail = policy.normalizedEmail;
  const user = await getAuthUserByEmail(normalizedEmail);

  if (purpose === "signup" && user?.emailVerified) {
    return { ok: false, code: "email_registered" };
  }

  if (purpose === "password-reset" && !user) {
    return { ok: false, code: "user_not_found" };
  }

  const now = new Date();
  const since = new Date(now.getTime() - 60 * 60_000);
  const ipHash = getIpHash(ip);
  const [emailRecords, ipRecords] = await Promise.all([
    getRecentEmailChallenges({ email: normalizedEmail, purpose, since }),
    getRecentIpChallenges({ ipHash, purpose, since }),
  ]);
  const sendPolicy = canSendOtp(emailRecords, ipRecords, now);

  if (!sendPolicy.allowed) {
    return { ok: false, code: "rate_limited" };
  }

  const code = generateOtpCode();
  await createAuthOtpChallenge({
    email: normalizedEmail,
    purpose,
    codeHash: hashOtpCode({
      email: normalizedEmail,
      purpose,
      code,
      secret: getOtpSecret(),
    }),
    ipHash,
    expiresAt: new Date(now.getTime() + OTP_EXPIRES_MS),
  });

  await sendZeaburEmail({
    to: normalizedEmail,
    ...getOtpEmailContent({ purpose, code }),
  });

  return { ok: true, sent: true };
}

export async function completeSignupWithOtp({
  email,
  name,
  password,
  code,
}: {
  email: string;
  name: string;
  password: string;
  code: string;
}): Promise<CompleteOtpResult> {
  const policy = getEmailSignupPolicy(email);

  if (!policy.allowed) return { ok: false, code: "invalid_email" };
  if (!validatePassword(password)) return { ok: false, code: "password_too_short" };

  const normalizedEmail = policy.normalizedEmail;
  const verified = await verifyAuthOtp({
    email: normalizedEmail,
    purpose: "signup",
    code,
  });

  if (!verified.ok) return verified;

  const existingUser = await getAuthUserByEmail(normalizedEmail);
  if (existingUser?.emailVerified) {
    return { ok: false, code: "email_registered" };
  }

  if (existingUser) {
    await verifyUserAndSetCredentialPassword({
      userId: existingUser.id,
      name,
      password,
    });
  } else {
    await createVerifiedCredentialUser({
      email: normalizedEmail,
      name,
      password,
    });
  }

  return { ok: true };
}

export async function resetPasswordWithOtp({
  email,
  password,
  code,
}: {
  email: string;
  password: string;
  code: string;
}): Promise<CompleteOtpResult> {
  const policy = getEmailSignupPolicy(email);

  if (!policy.allowed) return { ok: false, code: "invalid_email" };
  if (!validatePassword(password)) return { ok: false, code: "password_too_short" };

  const normalizedEmail = policy.normalizedEmail;
  const user = await getAuthUserByEmail(normalizedEmail);

  if (!user) return { ok: false, code: "user_not_found" };

  const verified = await verifyAuthOtp({
    email: normalizedEmail,
    purpose: "password-reset",
    code,
  });

  if (!verified.ok) return verified;

  await setCredentialPasswordAndRevokeSessions({
    userId: user.id,
    password,
  });

  return { ok: true };
}
