import { describe, expect, it, vi } from "vitest";
import { config } from "./proxy";

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

function matchesProxy(path: string) {
  return new RegExp(`^${config.matcher[0]}$`).test(path);
}

describe("proxy matcher", () => {
  it("leaves the static payment page outside session-gated navigation", () => {
    expect(matchesProxy("/payment")).toBe(false);
    expect(matchesProxy("/payment/success")).toBe(false);
  });

  it("still protects workspace pages", () => {
    expect(matchesProxy("/workspace")).toBe(true);
  });
});
