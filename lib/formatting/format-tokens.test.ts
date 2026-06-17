import { describe, expect, it } from "vitest";
import {
  FORMAT_THEMES,
  WRITEFLOW_EDITORIAL_TOKENS,
} from "./format-tokens";

describe("WRITEFLOW_EDITORIAL_TOKENS", () => {
  it("uses the project blue-gray brand palette", () => {
    expect(WRITEFLOW_EDITORIAL_TOKENS.colors).toMatchObject({
      text: "#233044",
      muted: "#5f7993",
      accent: "#5f7993",
      accentStrong: "#233044",
      accentAction: "#233044",
      accentSoft: "#eef2f6",
      accentPale: "#f7f9fb",
      surface: "#ffffff",
      border: "rgba(35,48,68,0.16)",
    });
    expect(WRITEFLOW_EDITORIAL_TOKENS.border).toBe(
      "1px solid rgba(35,48,68,0.16)"
    );
    expect(WRITEFLOW_EDITORIAL_TOKENS.colors.accent).not.toBe("#a45a3f");
    expect(FORMAT_THEMES["writeflow-editorial"]).toBe(
      WRITEFLOW_EDITORIAL_TOKENS
    );
  });
});
