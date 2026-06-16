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

    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: "注册" }));
    await user.type(screen.getByLabelText("昵称"), "内容主理人");
    await user.type(screen.getByLabelText("邮箱"), "reader@example.com");
    await user.type(screen.getByLabelText("密码"), "password123");
    await user.click(screen.getByRole("button", { name: "创建账号" }));

    await waitFor(() => {
      expect(authClientMocks.signUpEmail).toHaveBeenCalledWith({
        name: "内容主理人",
        email: "reader@example.com",
        password: "password123",
        callbackURL: "/",
      });
    });
    expect(
      await screen.findByText(/验证邮件已经发送/i)
    ).toBeInTheDocument();
  });

  it("requests a password reset email", async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText("邮箱"), "reader@example.com");
    await user.click(screen.getByRole("button", { name: "忘记密码？" }));

    await waitFor(() => {
      expect(authClientMocks.requestPasswordReset).toHaveBeenCalledWith({
        email: "reader@example.com",
        redirectTo: "/reset-password",
      });
    });
    expect(
      await screen.findByText(/如果这个邮箱存在/i)
    ).toBeInTheDocument();
  });
});
