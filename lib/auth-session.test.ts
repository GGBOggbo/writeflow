import { describe, expect, it, vi } from "vitest";
import { safeGetSession } from "./auth-session";

describe("safeGetSession", () => {
  it("returns null when Better Auth cannot read the session", async () => {
    await expect(
      safeGetSession({
        headers: new Headers(),
        getSession: vi.fn().mockRejectedValue(new Error("Failed to get session")),
      })
    ).resolves.toBeNull();
  });
});
