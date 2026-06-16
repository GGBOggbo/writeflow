import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const userMocks = vi.hoisted(() => ({
  getAuthUserByEmail: vi.fn(),
}));

vi.mock("@/lib/auth-users", () => ({
  getAuthUserByEmail: userMocks.getAuthUserByEmail,
}));

describe("POST /api/auth/email-status", () => {
  beforeEach(() => {
    userMocks.getAuthUserByEmail.mockReset().mockResolvedValue(null);
  });

  it("returns whether an auth email already exists", async () => {
    userMocks.getAuthUserByEmail.mockResolvedValueOnce({
      email: "reader@example.com",
      emailVerified: true,
    });

    const response = await POST(
      new Request("http://localhost:3000/api/auth/email-status", {
        method: "POST",
        body: JSON.stringify({ email: "Reader@Example.com" }),
        headers: {
          "Content-Type": "application/json",
        },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      exists: true,
      emailVerified: true,
    });
    expect(userMocks.getAuthUserByEmail).toHaveBeenCalledWith(
      "reader@example.com"
    );
  });

  it("rejects invalid email input", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/auth/email-status", {
        method: "POST",
        body: JSON.stringify({ email: "not-email" }),
        headers: {
          "Content-Type": "application/json",
        },
      })
    );

    expect(response.status).toBe(400);
    expect(userMocks.getAuthUserByEmail).not.toHaveBeenCalled();
  });
});
