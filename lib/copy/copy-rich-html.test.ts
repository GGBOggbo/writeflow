import { beforeEach, describe, expect, it, vi } from "vitest";
import { copyRichHtml } from "./copy-rich-html";

describe("copyRichHtml", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    Object.defineProperty(document, "execCommand", {
      value: vi.fn(),
      configurable: true,
      writable: true,
    });
  });

  it("writes html and plain text to the modern clipboard", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const clipboardItems: Array<Record<string, Blob>> = [];
    Object.defineProperty(globalThis, "navigator", {
      value: { clipboard: { write } },
      configurable: true,
    });
    vi.stubGlobal(
      "ClipboardItem",
      class {
        constructor(public value: Record<string, Blob>) {
          clipboardItems.push(value);
        }
      }
    );

    await copyRichHtml(
      '<section data-wechat-format="professional-blue"><p data-format-block="paragraph">正文</p></section>',
      "正文"
    );

    expect(write).toHaveBeenCalledTimes(1);
    await expect(clipboardItems[0]["text/html"].text()).resolves.toBe(
      "<section><p>正文</p></section>"
    );
  });

  it("strips :::wf- fences from plain text so paste targets never see raw module syntax", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const clipboardItems: Array<Record<string, Blob>> = [];
    Object.defineProperty(globalThis, "navigator", {
      value: { clipboard: { write } },
      configurable: true,
    });
    vi.stubGlobal(
      "ClipboardItem",
      class {
        constructor(public value: Record<string, Blob>) {
          clipboardItems.push(value);
        }
      }
    );

    // 模拟 AI 排版产出:含 :::wf- 围栏的 markdown
    const markdownWithFences = `正文段。

:::wf-hook
body: 你让AI干活
:::

:::wf-case
title: 案例
body: 案例正文
result: 结果
:::

结尾。`;

    await copyRichHtml("<section><p>正文</p></section>", markdownWithFences);

    const plainOutput = await clipboardItems[0]["text/plain"].text();
    // 剪贴板的纯文本降级绝不能暴露围栏语法
    expect(plainOutput).not.toContain(":::");
    expect(plainOutput).not.toContain("wf-hook");
    expect(plainOutput).not.toContain("body:");
    expect(plainOutput).not.toContain("title:");
    // 但正文文字要保留
    expect(plainOutput).toContain("你让AI干活");
    expect(plainOutput).toContain("案例正文");
    expect(plainOutput).toContain("结尾");
  });

  it("falls back to selecting rendered html with execCommand", async () => {
    let selectedHtml = "";
    Object.defineProperty(globalThis, "navigator", {
      value: { clipboard: {} },
      configurable: true,
    });
    vi.stubGlobal("ClipboardItem", undefined);
    vi.spyOn(document, "execCommand").mockImplementation(() => {
      selectedHtml = document.body.lastElementChild?.innerHTML ?? "";
      return true;
    });

    await expect(
      copyRichHtml('<section data-internal="yes"><p>正文</p></section>', "正文")
    ).resolves.toBeUndefined();
    expect(document.execCommand).toHaveBeenCalledWith("copy");
    expect(selectedHtml).toBe("<section><p>正文</p></section>");
  });
});
