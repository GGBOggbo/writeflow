import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const creditMocks = vi.hoisted(() => ({
  getBalance: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: authMocks.getSession,
    },
  },
}));

vi.mock("@/lib/credits", () => ({
  creditStore: creditMocks,
}));

describe("GET /api/credits", () => {
  beforeEach(() => {
    authMocks.getSession.mockReset().mockResolvedValue({
      user: { id: "test-user" },
    });
    creditMocks.getBalance.mockReset().mockReturnValue({
      unlimited: false,
      remaining: 5,
    });
  });

  it("returns the authenticated user's balance", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/credits")
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      unlimited: false,
      remaining: 5,
    });
    expect(creditMocks.getBalance).toHaveBeenCalledWith("test-user");
  });

  it("rejects unauthenticated requests", async () => {
    authMocks.getSession.mockResolvedValueOnce(null);

    const response = await GET(
      new Request("http://localhost:3000/api/credits")
    );

    expect(response.status).toBe(401);
  });
});
