import { beforeEach, describe, expect, it, vi } from "vitest";
import { copyText } from "./copy-text";

describe("copyText", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    Object.defineProperty(document, "execCommand", {
      value: vi.fn(),
      configurable: true,
      writable: true,
    });
  });

  it("falls back to execCommand when clipboard.writeText fails", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error("blocked")),
        },
      },
      configurable: true,
    });

    const execCommandSpy = vi
      .spyOn(document, "execCommand")
      .mockReturnValue(true);

    await expect(copyText("hello world")).resolves.toBeUndefined();
    expect(execCommandSpy).toHaveBeenCalledWith("copy");
  });

  it("throws when both clipboard and fallback copy fail", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error("blocked")),
        },
      },
      configurable: true,
    });

    vi.spyOn(document, "execCommand").mockReturnValue(false);

    await expect(copyText("hello world")).rejects.toThrow(
      /不支持自动复制|copy/i
    );
  });
});
