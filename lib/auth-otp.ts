import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export type AuthOtpPurpose = "signup" | "password-reset";

type EmailSignupPolicy =
  | {
      allowed: true;
      normalizedEmail: string;
      reason: "allowed";
    }
  | {
      allowed: false;
      normalizedEmail: string;
      reason: "invalid_email" | "google_sso" | "unsupported_domain";
    };

type OtpSendRecord = {
  createdAt: Date;
};

const ALLOWED_EMAIL_DOMAINS = new Set([
  "qq.com",
  "vip.qq.com",
  "foxmail.com",
  "163.com",
  "126.com",
  "yeah.net",
  "sina.com",
  "sina.cn",
  "139.com",
  "189.cn",
  "wo.cn",
  "aliyun.com",
  "sohu.com",
  "tom.com",
  "21cn.com",
]);

const GOOGLE_EMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

export const OTP_RESEND_COOLDOWN_MS = 60_000;
export const OTP_EMAIL_HOURLY_LIMIT = 5;
export const OTP_IP_HOURLY_LIMIT = 20;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_LOCK_MS = 15 * 60_000;
export const OTP_EXPIRES_MS = 10 * 60_000;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getEmailSignupPolicy(email: string): EmailSignupPolicy {
  const normalizedEmail = normalizeEmail(email);
  const atIndex = normalizedEmail.lastIndexOf("@");

  if (atIndex <= 0 || atIndex === normalizedEmail.length - 1) {
    return {
      allowed: false,
      normalizedEmail,
      reason: "invalid_email",
    };
  }

  const domain = normalizedEmail.slice(atIndex + 1);

  if (GOOGLE_EMAIL_DOMAINS.has(domain)) {
    return {
      allowed: false,
      normalizedEmail,
      reason: "google_sso",
    };
  }

  if (!ALLOWED_EMAIL_DOMAINS.has(domain)) {
    return {
      allowed: false,
      normalizedEmail,
      reason: "unsupported_domain",
    };
  }

  return {
    allowed: true,
    normalizedEmail,
    reason: "allowed",
  };
}

export function canSendOtp(
  emailRecords: OtpSendRecord[],
  ipRecords: OtpSendRecord[],
  now = new Date()
) {
  const latestEmailRecord = emailRecords.reduce<OtpSendRecord | undefined>(
    (latest, record) =>
      !latest || record.createdAt > latest.createdAt ? record : latest,
    undefined
  );

  if (
    latestEmailRecord &&
    now.getTime() - latestEmailRecord.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS
  ) {
    return {
      allowed: false,
      reason: "cooldown" as const,
    };
  }

  if (emailRecords.length >= OTP_EMAIL_HOURLY_LIMIT) {
    return {
      allowed: false,
      reason: "email_hourly_limit" as const,
    };
  }

  if (ipRecords.length >= OTP_IP_HOURLY_LIMIT) {
    return {
      allowed: false,
      reason: "ip_hourly_limit" as const,
    };
  }

  return {
    allowed: true,
    reason: "allowed" as const,
  };
}

export function generateOtpCode() {
  return String(randomInt(100000, 1000000));
}

export function hashOtpCode({
  email,
  purpose,
  code,
  secret,
}: {
  email: string;
  purpose: AuthOtpPurpose;
  code: string;
  secret: string;
}) {
  return createHmac("sha256", secret)
    .update(`${normalizeEmail(email)}:${purpose}:${code}`)
    .digest("hex");
}

export function verifyOtpCodeHash({
  email,
  purpose,
  code,
  hash,
  secret,
}: {
  email: string;
  purpose: AuthOtpPurpose;
  code: string;
  hash: string;
  secret: string;
}) {
  const candidate = hashOtpCode({ email, purpose, code, secret });
  const candidateBuffer = Buffer.from(candidate, "hex");
  const hashBuffer = Buffer.from(hash, "hex");

  if (candidateBuffer.length !== hashBuffer.length) return false;

  return timingSafeEqual(candidateBuffer, hashBuffer);
}
