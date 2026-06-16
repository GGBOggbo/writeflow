import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./page";

const authClientMocks = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
  signInEmail: vi.fn(),
  signInSocial: vi.fn(),
  signUpEmail: vi.fn(),
}));

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: navigationMocks.push,
  }),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    requestPasswordReset: authClientMocks.requestPasswordReset,
    signIn: {
      email: authClientMocks.signInEmail,
      social: authClientMocks.signInSocial,
    },
    signUp: {
      email: authClientMocks.signUpEmail,
    },
  },
}));

describe("LoginPage", () => {
  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue(
      new Response(JSON.stringify({ exists: false, emailVerified: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    authClientMocks.requestPasswordReset.mockReset().mockResolvedValue({
      data: { status: true },
      error: null,
    });
    authClientMocks.signInEmail.mockReset().mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    authClientMocks.signInSocial.mockReset().mockResolvedValue({
      data: null,
      error: null,
    });
    authClientMocks.signUpEmail.mockReset().mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    navigationMocks.push.mockReset();
  });

  it("signs in with email and password", async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText("邮箱"), "reader@example.com");
    await user.type(screen.getByLabelText("密码"), "password123");
    await user.click(screen.getByRole("button", { name: "邮箱登录" }));

    await waitFor(() => {
      expect(authClientMocks.signInEmail).toHaveBeenCalledWith({
        email: "reader@example.com",
        password: "password123",
        callbackURL: "/",
      });
    });
    expect(navigationMocks.push).toHaveBeenCalledWith("/");
  });

  it("registers with email, name, and password", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, sent: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: "注册" }));
    await user.type(screen.getByLabelText("昵称"), "内容主理人");
    await user.type(screen.getByLabelText("邮箱"), "reader@qq.com");
    await user.type(screen.getByLabelText("密码"), "password123");
    await user.click(screen.getByRole("button", { name: "发送验证码" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/auth/email-otp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: "reader@qq.com", purpose: "signup" }),
      });
    });
    expect(
      await screen.findByText(/验证码已经发送/i)
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("验证码"), "123456");
    await user.click(screen.getByRole("button", { name: "完成注册" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/auth/email-otp/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "内容主理人",
          email: "reader@qq.com",
          password: "password123",
          code: "123456",
        }),
      });
    });
    expect(await screen.findByText(/注册完成/i)).toBeInTheDocument();
    expect(authClientMocks.signUpEmail).not.toHaveBeenCalled();
  });

  it("blocks registration when the email already exists", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "这个邮箱已经注册，请直接登录。" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    );

    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: "注册" }));
    await user.type(screen.getByLabelText("昵称"), "内容主理人");
    await user.type(screen.getByLabelText("邮箱"), "reader@qq.com");
    await user.type(screen.getByLabelText("密码"), "password123");
    await user.click(screen.getByRole("button", { name: "发送验证码" }));

    expect(
      await screen.findByText(/这个邮箱已经注册/i)
    ).toBeInTheDocument();
    expect(authClientMocks.signUpEmail).not.toHaveBeenCalled();
  });

  it("resets a password with an email OTP", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, sent: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: "忘记密码？" }));
    await user.type(screen.getByLabelText("邮箱"), "reader@qq.com");
    await user.click(screen.getByRole("button", { name: "发送验证码" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/auth/email-otp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "reader@qq.com",
          purpose: "password-reset",
        }),
      });
    });
    expect(await screen.findByText(/验证码已经发送/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText("验证码"), "123456");
    await user.type(screen.getByLabelText("新密码"), "newpassword123");
    await user.click(screen.getByRole("button", { name: "重置密码" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/auth/email-otp/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "reader@qq.com",
          password: "newpassword123",
          code: "123456",
        }),
      });
    });
    expect(await screen.findByText(/密码已重置/i)).toBeInTheDocument();
    expect(authClientMocks.requestPasswordReset).not.toHaveBeenCalled();
  });

  it("shows a clear message when resetting an unregistered email", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "这个邮箱还没有注册。" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    );

    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: "忘记密码？" }));
    await user.type(screen.getByLabelText("邮箱"), "missing@qq.com");
    await user.click(screen.getByRole("button", { name: "发送验证码" }));

    expect(
      await screen.findByText(/这个邮箱还没有注册/i)
    ).toBeInTheDocument();
  });
});
