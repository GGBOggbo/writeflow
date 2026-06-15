import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ADVANCED_MODULE_NAMES } from "@/lib/markdown/advanced-modules";
import { renderExtendedMarkdown } from "./render-extended-markdown";

const fixture = readFileSync(
  "lib/formatting/fixtures/md2wechat-all-modules.md",
  "utf8"
);

describe("renderExtendedMarkdown", () => {
  it("renders all 31 modules inside one wechat-native article root", () => {
    const html = renderExtendedMarkdown(fixture);
    const ids = [...html.matchAll(/data-mpa-action-id="([^"]+)"/g)]
      .map((match) => match[1])
      .filter((id) => !id.startsWith("faq_"));

    expect(new Set(ids)).toEqual(new Set(ADVANCED_MODULE_NAMES));
    expect(html.match(/data-wechat-theme="wechat-native"/g)).toHaveLength(1);
    expect(html).not.toContain(":::");
  });

  it("keeps ordinary Markdown in source order around advanced modules", () => {
    const html = renderExtendedMarkdown(`## 前文

普通段落。

:::summary
highlight: 中间结论
body: 模块正文
:::

## 后文`);

    expect(html.indexOf("前文")).toBeLessThan(html.indexOf("中间结论"));
    expect(html.indexOf("中间结论")).toBeLessThan(html.indexOf("后文"));
    expect(html).toContain("<h2");
  });

  it("keeps malformed modules visible and sanitizes executable markup", () => {
    const html = renderExtendedMarkdown(`:::hero
title: 还没写完

<script>alert(1)</script>

[危险链接](javascript:alert(2))`);

    expect(html).toContain(":::hero");
    expect(html).toContain("还没写完");
    expect(html).not.toMatch(/<script|javascript:|alert\(/i);
  });

  it("keeps footnotes working when advanced modules separate references and definitions", () => {
    const html = renderExtendedMarkdown(`正文需要补充说明[^1]。

:::summary
highlight: 中间结论
body: 模块正文
:::

[^1]: 跨模块脚注内容。`);

    expect(html).toContain('href="#fn-1"');
    expect(html).toContain('id="fn-1"');
    expect(html).toContain("跨模块脚注内容");
    expect(html.indexOf("中间结论")).toBeLessThan(html.indexOf("跨模块脚注内容"));
  });
});
