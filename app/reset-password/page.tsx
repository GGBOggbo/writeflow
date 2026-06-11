"use client";

import { useState, Suspense } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const result = await authClient.resetPassword({
        newPassword,
        token: token!,
      });
      if (result.error) {
        setError(result.error.message || "重置失败");
        setLoading(false);
        return;
      }
      setSuccess("密码重置成功！即将跳转到登录页…");
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("操作失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-[var(--accent-ink)]">无效的链接</h1>
        <p className="mt-2 text-sm text-[var(--accent-warm)]">
          重置密码链接无效或已过期，请在登录页重新申请。
        </p>
        <a
          href="/login"
          className="mt-4 inline-block rounded-lg bg-[var(--accent-ink)] px-4 py-2 text-sm font-medium text-white"
        >
          返回登录
        </a>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-6 shadow-sm">
      <div className="mb-6 text-center">
        <h1 className="text-lg font-semibold tracking-tight text-[var(--accent-ink)]">
          重置密码
        </h1>
        <p className="mt-1 text-sm text-[var(--accent-warm)]">输入新密码</p>
      </div>

      {success && (
        <div className="mb-4 rounded-lg bg-green-50 px-3 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {!success && (
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--accent-ink)]">
              新密码
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              placeholder="至少 8 位新密码"
              className="w-full rounded-lg border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--accent-warm)]/60 focus:border-[var(--accent-warm)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-warm)]/30"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--accent-ink)] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-ink)]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "处理中…" : "重置密码"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <Suspense fallback={<div className="text-sm text-[var(--accent-warm)]">加载中…</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
