import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEGACY_ADVANCED_MODULE_NAMES } from "@/lib/markdown/module-defs";
import { renderExtendedMarkdown } from "./render-extended-markdown";

const fixture = readFileSync(
  "lib/formatting/fixtures/md2wechat-all-modules.md",
  "utf8"
);

describe("renderExtendedMarkdown", () => {
  it.skip("renders all legacy modules inside one writeflow editorial article root", () => {
    const html = renderExtendedMarkdown(fixture);
    const ids = [...html.matchAll(/data-mpa-action-id="([^"]+)"/g)]
      .map((match) => match[1])
      .filter((id) => !id.startsWith("faq_"));

    expect(new Set(ids)).toEqual(new Set(LEGACY_ADVANCED_MODULE_NAMES));
    expect(html.match(/data-wechat-theme="writeflow-editorial"/g)).toHaveLength(
      1
    );
    expect(html).not.toContain(":::");
  });

  it("renders wf modules inside a writeflow editorial article root", () => {
    const html = renderExtendedMarkdown(`正文开头。

:::wf-section
index: 01
title: 先跑通主流程
:::

:::wf-pullquote
quote: 预览好看不算完成，粘贴不塌才算完成。
:::`);

    expect(html).toContain('data-wechat-theme="writeflow-editorial"');
    expect(html).toContain('data-writeflow-module="wf-section"');
    expect(html).toContain("预览好看不算完成");
    expect(html).not.toContain("data-mpa-action-id");
  });

  it.skip("keeps ordinary Markdown in source order around advanced modules", () => {
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

  it("renders material placeholders as blocking warning cards instead of polished notice cards", () => {
    const html = renderExtendedMarkdown(`正文开头。

【💡需要你补充：第一次发现问题的真实场景】

正文继续。`);

    expect(html).toContain('data-material-placeholder="required"');
    expect(html).toContain("必须补充真实素材");
    expect(html).toContain("需要你补充");
    expect(html).toContain("第一次发现问题的真实场景");
    expect(html).toContain("background:#fff1f2");
    expect(html).not.toContain('data-mpa-action-id="notice"');
    expect(html).not.toContain("【💡");
  });

  it("degrades oversized duplicate CTA modules to ordinary text without losing content", () => {
    const argument =
      "这一步卡住的随机性在哪？卡在结构上。AI 直接写代码最大的问题是边写边改，写到后面发现前面的设计不对，又回头改。";
    const html = renderExtendedMarkdown(`正文开头。

:::cta
title: ${argument}
note: ${argument}
:::

正文继续。`);

    expect(html).not.toContain('data-mpa-action-id="cta"');
    expect(html.match(/这一步卡住的随机性在哪/g)).toHaveLength(1);
    expect(html).not.toContain(":::");
    expect(html).toContain("正文继续");
  });

  it("renders wf-compare field-type input as a two-column comparison grid", () => {
    // wf-compare 支持字段型写法(side:/heading:/body: 重复多组),
    // 渲染成左右两列对照网格。
    const html = renderExtendedMarkdown(`:::wf-compare
side: 常规模型
heading: 遗忘冲突
body: 处理长文档时遗漏关键信息。

side: GLM-5.2
heading: 全程记忆
body: 提取了全部付款节点。
:::`);

    expect(html).toContain('data-writeflow-module="wf-compare"');
    expect(html).toContain("grid-template-columns:1fr 1fr");
    expect(html).toContain("常规模型");
    expect(html).toContain("GLM-5.2");
    expect(html).not.toContain(":::wf");
  });

  it("renders a format-hint card when a pure row module is miswritten as field type", () => {
    // wf-points 是纯行型模块(无字段写法),若被写成 key: value 字段格式,
    // 渲染格式提示卡而非静默降级。
    const html = renderExtendedMarkdown(`:::wf-points
index: 01
heading: 第一点
body: 说明。
:::`);

    expect(html).toContain('data-writeflow-module="wf-points"');
    expect(html).toContain("格式提示");
  });

  it.skip("still renders concise valid CTA modules", () => {
    const html = renderExtendedMarkdown(`:::cta
title: 先把主流程完整跑一遍
note: BUILD WITH STRUCTURE
:::`);

    expect(html).toContain('data-mpa-action-id="cta"');
    expect(html).toContain("先把主流程完整跑一遍");
  });
});
