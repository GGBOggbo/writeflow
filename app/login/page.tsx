"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type AuthMode = "signin" | "signup";
type LoginView = AuthMode | "reset";
type LoadingAction = "email" | "otp" | "github" | "google" | null;

const PROVIDERS = [
  {
    id: "google" as const,
    label: "Google",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
  },
  {
    id: "github" as const,
    label: "GitHub",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
  },
] as const;

function getAuthErrorMessage(message?: string) {
  if (!message) {
    return "操作失败，请稍后重试。";
  }

  if (message.includes("EMAIL_NOT_VERIFIED")) {
    return "邮箱还未验证，验证邮件已经重新发送，请先打开邮箱完成验证。";
  }

  if (message.includes("Invalid email or password")) {
    return "邮箱或密码不正确。";
  }

  return message;
}

async function postJson(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(data?.error || "操作失败，请稍后重试。");
  }

  return response.json();
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginView>("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState<LoadingAction>(null);
  const isBusy = loading !== null;

  const switchMode = (nextMode: LoginView) => {
    setMode(nextMode);
    setError("");
    setNotice("");
    setCode("");
    setOtpSent(false);
  };

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading("email");

    try {
      if (mode === "signup") {
        if (!otpSent) {
          await postJson("/api/auth/email-otp/send", {
            email,
            purpose: "signup",
          });
          setOtpSent(true);
          setNotice("验证码已经发送，请打开邮箱查看 6 位验证码。");
          return;
        }

        await postJson("/api/auth/email-otp/signup", {
          name,
          email,
          password,
          code,
        });

        setMode("signin");
        setCode("");
        setOtpSent(false);
        setNotice("注册完成，请使用邮箱和密码登录。");
        return;
      }

      if (mode === "reset") {
        if (!otpSent) {
          await postJson("/api/auth/email-otp/send", {
            email,
            purpose: "password-reset",
          });
          setOtpSent(true);
          setNotice("验证码已经发送。如果这个邮箱存在，请打开邮箱查看 6 位验证码。");
          return;
        }

        await postJson("/api/auth/email-otp/reset-password", {
          email,
          password,
          code,
        });

        setMode("signin");
        setCode("");
        setOtpSent(false);
        setPassword("");
        setNotice("密码已重置，请使用新密码登录。");
        return;
      }

      const result = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/",
      });

      if (result.error) {
        setError(getAuthErrorMessage(result.error.message));
        return;
      }

      router.push("/");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "操作失败，请稍后重试。"
      );
    } finally {
      setLoading(null);
    }
  };

  const handlePasswordReset = () => {
    setError("");
    setNotice("");
    setCode("");
    setPassword("");
    setOtpSent(false);
    setMode("reset");
  };

  const handleSocialLogin = async (provider: "github" | "google") => {
    setError("");
    setNotice("");
    setLoading(provider);
    await authClient.signIn.social({
      provider,
      callbackURL: "/",
    });
    setLoading(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <p className="editorial-kicker text-xs font-semibold text-[var(--accent-warm)]">
            主编陪跑型工作台
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-[var(--accent-ink)]">
            AI 共创工作台
          </h1>
          <p className="editorial-copy mt-3 text-sm text-stone-600">
            用邮箱或第三方账号进入你的成稿工作台
          </p>
        </div>

        <div className="editorial-card-strong editorial-texture relative overflow-hidden rounded-[32px] px-5 py-6 sm:px-6">
          <div className="absolute inset-y-0 right-0 hidden w-[34%] bg-[radial-gradient(circle_at_top_right,rgba(207,220,235,0.5),transparent_58%),linear-gradient(180deg,rgba(255,255,255,0.32),transparent)] lg:block" />

          <div className="relative">
            <div className="mb-5 grid grid-cols-2 rounded-full border border-[rgba(35,48,68,0.08)] bg-white/70 p-1">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className={[
                  "min-h-10 rounded-full text-sm font-semibold transition",
                  mode === "signin" || mode === "reset"
                    ? "bg-[#233044] text-white shadow-sm"
                    : "text-stone-500 hover:bg-white hover:text-[#233044]",
                ].join(" ")}
              >
                登录
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={[
                  "min-h-10 rounded-full text-sm font-semibold transition",
                  mode === "signup"
                    ? "bg-[#233044] text-white shadow-sm"
                    : "text-stone-500 hover:bg-white hover:text-[#233044]",
                ].join(" ")}
              >
                注册
              </button>
            </div>

            <form className="space-y-3" onSubmit={handleEmailSubmit}>
              {mode === "signup" ? (
                <label className="block text-sm font-medium text-[#233044]">
                  昵称
                  <input
                    autoComplete="name"
                    className="mt-1.5 w-full rounded-[18px] border border-[rgba(35,48,68,0.1)] bg-white/90 px-4 py-3 text-sm text-[#233044] outline-none transition placeholder:text-stone-400 focus:border-[rgba(95,121,147,0.4)] focus:ring-4 focus:ring-[rgba(95,121,147,0.12)]"
                    disabled={isBusy || otpSent}
                    minLength={1}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="例如：内容主理人"
                    required
                    type="text"
                    value={name}
                  />
                </label>
              ) : null}

              <label className="block text-sm font-medium text-[#233044]">
                邮箱
                <input
                  autoComplete="email"
                  className="mt-1.5 w-full rounded-[18px] border border-[rgba(35,48,68,0.1)] bg-white/90 px-4 py-3 text-sm text-[#233044] outline-none transition placeholder:text-stone-400 focus:border-[rgba(95,121,147,0.4)] focus:ring-4 focus:ring-[rgba(95,121,147,0.12)]"
                  disabled={isBusy}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  type="email"
                  value={email}
                />
              </label>

              {mode !== "reset" || otpSent ? (
                <label className="block text-sm font-medium text-[#233044]">
                  {mode === "reset" ? "新密码" : "密码"}
                  <input
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    className="mt-1.5 w-full rounded-[18px] border border-[rgba(35,48,68,0.1)] bg-white/90 px-4 py-3 text-sm text-[#233044] outline-none transition placeholder:text-stone-400 focus:border-[rgba(95,121,147,0.4)] focus:ring-4 focus:ring-[rgba(95,121,147,0.12)]"
                    disabled={isBusy || (mode === "signup" && otpSent)}
                    minLength={8}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="至少 8 位"
                    required
                    type="password"
                    value={password}
                  />
                </label>
              ) : null}

              {(mode === "signup" || mode === "reset") && otpSent ? (
                <label className="block text-sm font-medium text-[#233044]">
                  验证码
                  <input
                    autoComplete="one-time-code"
                    className="mt-1.5 w-full rounded-[18px] border border-[rgba(35,48,68,0.1)] bg-white/90 px-4 py-3 text-sm text-[#233044] outline-none transition placeholder:text-stone-400 focus:border-[rgba(95,121,147,0.4)] focus:ring-4 focus:ring-[rgba(95,121,147,0.12)]"
                    disabled={isBusy}
                    inputMode="numeric"
                    maxLength={6}
                    minLength={6}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="6 位数字"
                    required
                    type="text"
                    value={code}
                  />
                </label>
              ) : null}

              {error ? (
                <p className="rounded-[18px] border border-[rgba(184,108,95,0.22)] bg-[#fff4f1] px-4 py-3 text-sm text-[#9c2a25]">
                  {error}
                </p>
              ) : null}

              {notice ? (
                <p className="rounded-[18px] border border-[rgba(108,139,116,0.22)] bg-[#f0f7f2] px-4 py-3 text-sm text-[#476251]">
                  {notice}
                </p>
              ) : null}

              <button
                className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#233044] bg-[#233044] px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1a2432] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isBusy}
                type="submit"
              >
                {loading === "email"
                  ? "处理中..."
                  : mode === "signup"
                    ? otpSent
                      ? "完成注册"
                      : "发送验证码"
                    : mode === "reset"
                      ? otpSent
                        ? "重置密码"
                        : "发送验证码"
                      : "邮箱登录"}
              </button>
            </form>

            {mode === "signin" ? (
              <div className="mt-3 text-right">
                <button
                  className="text-xs font-medium text-[#5f7993] transition hover:text-[#233044]"
                  disabled={isBusy}
                  onClick={handlePasswordReset}
                  type="button"
                >
                  忘记密码？
                </button>
              </div>
            ) : null}

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-[rgba(35,48,68,0.08)]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">
                或使用
              </span>
              <span className="h-px flex-1 bg-[rgba(35,48,68,0.08)]" />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => handleSocialLogin(provider.id)}
                  disabled={isBusy}
                  className="group flex min-h-11 items-center justify-center gap-2 rounded-full border border-[rgba(35,48,68,0.08)] bg-white/88 px-4 text-sm font-medium text-[var(--foreground)] transition hover:-translate-y-0.5 hover:bg-white hover:text-[var(--accent-ink)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--accent-warm)]">
                    {provider.icon}
                  </span>
                  <span>{provider.label}</span>
                </button>
              ))}
            </div>

            <p className="mt-4 text-center text-[11px] text-stone-400">
              注册或登录即表示同意服务条款
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
