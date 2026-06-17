import { describe, expect, it } from "vitest";
import {
  ADVANCED_MODULE_NAMES,
  advancedModuleToMarkdown,
  hasAdvancedModules,
  parseAdvancedMarkdown,
  validateAdvancedModuleContracts,
  validateAdvancedModuleNode,
} from "./advanced-modules";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("parseAdvancedMarkdown", () => {
  it("parses field, row, and special modules without changing surrounding Markdown", () => {
    const nodes = parseAdvancedMarkdown(`开场正文。

:::hero
eyebrow: 深度观察
title: 结构比颜色重要
:::

:::metrics[核心数据]
结构复用 | 31 模块 | 全部本地渲染 | accent
:::

:::dialogue[产品讨论]
用户: 为什么要模块化？
AI: 为了让结构稳定。
:::

结尾正文。`);

    expect(nodes).toHaveLength(5);
    expect(nodes[0]).toMatchObject({ type: "markdown", content: "开场正文。" });
    expect(nodes[1]).toMatchObject({
      type: "module",
      name: "hero",
      fields: { eyebrow: "深度观察", title: "结构比颜色重要" },
    });
    expect(nodes[2]).toMatchObject({
      type: "module",
      name: "metrics",
      title: "核心数据",
      rows: [["结构复用", "31 模块", "全部本地渲染", "accent"]],
    });
    expect(nodes[3]).toMatchObject({
      type: "module",
      name: "dialogue",
      title: "产品讨论",
      body: "用户: 为什么要模块化？\nAI: 为了让结构稳定。",
    });
    expect(nodes[4]).toMatchObject({ type: "markdown", content: "结尾正文。" });
  });

  it("recognizes the complete 39-module catalog", () => {
    expect(ADVANCED_MODULE_NAMES).toHaveLength(39);

    for (const name of ADVANCED_MODULE_NAMES) {
      const markdown = `:::${name}\nvalue: 示例\n:::`;
      const nodes = parseAdvancedMarkdown(markdown);

      expect(nodes).toHaveLength(1);
      expect(nodes[0]).toMatchObject({ type: "module", name });
      expect(hasAdvancedModules(markdown)).toBe(true);
    }
  });

  it("parses and validates Writeflow wf row modules", () => {
    const [node] = parseAdvancedMarkdown(`:::wf-steps
01 | 先确认主流程 | 不急着堆功能。
02 | 再验证预览 | 确认手机端愿意读。
:::`);

    expect(node?.type).toBe("module");
    if (!node || node.type !== "module") throw new Error("Expected module");
    expect(node.name).toBe("wf-steps");
    expect(node.rows).toEqual([
      ["01", "先确认主流程", "不急着堆功能。"],
      ["02", "再验证预览", "确认手机端愿意读。"],
    ]);
    expect(validateAdvancedModuleNode(node)).toEqual({ ok: true });
  });

  it("keeps unknown and unclosed module syntax visibly editable", () => {
    const unknown = `:::not-supported\ntitle: 不应吞掉\n:::`;
    const unclosed = `:::hero\ntitle: 还没写完`;

    expect(parseAdvancedMarkdown(unknown)).toEqual([
      { type: "markdown", content: unknown },
    ]);
    expect(parseAdvancedMarkdown(unclosed)).toEqual([
      { type: "markdown", content: unclosed },
    ]);
    expect(hasAdvancedModules(unknown)).toBe(false);
    expect(hasAdvancedModules(unclosed)).toBe(false);
  });

  it("preserves pipes inside field values and trims row cells", () => {
    const [node] = parseAdvancedMarkdown(`:::infographic
title: 让|重点|先被看到
flow: 判断重点 | 组织模块 | 统一输出
:::`);

    expect(node).toMatchObject({
      type: "module",
      name: "infographic",
      fields: {
        title: "让|重点|先被看到",
        flow: "判断重点 | 组织模块 | 统一输出",
      },
    });
  });

  it("validates all legacy modules in the complete local fixture", () => {
    const fixture = readFileSync(
      join(
        process.cwd(),
        "lib/formatting/fixtures/md2wechat-all-modules.md"
      ),
      "utf8"
    );

    expect(validateAdvancedModuleContracts(fixture)).toEqual({ ok: true });
  });

  it("validates the archived full-module Markdown reference", () => {
    const fixture = readFileSync(
      join(
        process.cwd(),
        "docs/audits/fixtures/md2wechat-wechat-native/full-module-source.md"
      ),
      "utf8"
    );

    expect(validateAdvancedModuleContracts(fixture)).toEqual({ ok: true });
  });

  it.each([
    [
      "missing required field",
      ":::verdict\neyebrow: 判断\nbody: 正文\n:::",
      "verdict 缺少必填字段 title",
    ],
    [
      "unknown field",
      ":::verdict\ntitle: 判断\nbody: 正文\ncontent: 不受支持\n:::",
      "verdict 包含未知字段 content",
    ],
    [
      "duplicate field",
      ":::verdict\ntitle: 判断一\ntitle: 判断二\nbody: 正文\n:::",
      "verdict 字段 title 不可重复",
    ],
    [
      "missing repeatable field",
      ":::image-annotate\ntitle: 标注\nimage: https://example.com/a.png\n:::",
      "image-annotate 字段 point 至少需要 1 次",
    ],
    [
      "malformed field line",
      ":::verdict\ntitle: 判断\nbody: 正文\n这行不是字段\n:::",
      "verdict 第 3 行必须使用 key: value",
    ],
    [
      "wrong repeatable field width",
      ":::image-annotate\ntitle: 标注\nimage: https://example.com/a.png\npoint: 01 | 主信息区 | 说明\n:::",
      "image-annotate 字段 point 第 1 次必须是 5 列",
    ],
    [
      "too few row columns",
      ":::cards\n01 | 开场\n:::",
      "cards 第 1 行至少需要 3 列",
    ],
    [
      "too many row columns",
      ":::faq\n问题 | 答案 | 多余\n:::",
      "faq 第 1 行最多允许 2 列",
    ],
    [
      "empty row module",
      ":::metrics\n\n:::",
      "metrics 至少需要 1 行",
    ],
    [
      "non-image content",
      ":::gallery\n这不是图片\n:::",
      "gallery 只允许 Markdown 图片",
    ],
    [
      "too many long images",
      ":::longimage\n![一](https://example.com/1.png)\n![二](https://example.com/2.png)\n:::",
      "longimage 最多允许 1 张图片",
    ],
    [
      "invalid dialogue",
      ":::dialogue\n用户: 为什么？\n这行没有角色\n:::",
      "dialogue 第 2 行必须使用“角色: 内容”",
    ],
  ])("rejects %s", (_label, markdown, reason) => {
    expect(validateAdvancedModuleContracts(markdown)).toEqual({
      ok: false,
      module: expect.any(String),
      reason,
    });
  });

  it("rejects oversized CTA arguments and duplicate title/note content", () => {
    expect(
      validateAdvancedModuleContracts(`:::cta
title: 这一步卡住的随机性在哪？卡在结构上。AI 直接写代码最大的问题是边写边改，写到后面发现前面的设计不对，又回头改。
note: 这一步卡住的随机性在哪？卡在结构上。AI 直接写代码最大的问题是边写边改，写到后面发现前面的设计不对，又回头改。
:::`)
    ).toEqual({
      ok: false,
      module: "cta",
      reason: expect.stringMatching(/title|重复/),
    });
  });

  it("accepts concise CTA and verdict content", () => {
    expect(
      validateAdvancedModuleContracts(`:::cta
title: 先把主流程完整跑一遍
note: BUILD WITH STRUCTURE
:::`)
    ).toEqual({ ok: true });
    expect(
      validateAdvancedModuleContracts(`:::verdict
title: 先验证流程，再升级配置
body: 稳定交付比纸面参数更重要。
:::`)
    ).toEqual({ ok: true });
  });

  it("degrades invalid field modules to unique readable Markdown without truncation", () => {
    const [node] = parseAdvancedMarkdown(`:::cta
title: 这是一段很长的结构论述，不是行动号召。
note: 这是一段很长的结构论述，不是行动号召。
:::`);

    if (!node || node.type !== "module") {
      throw new Error("Expected CTA module");
    }

    expect(advancedModuleToMarkdown(node)).toBe(
      "这是一段很长的结构论述，不是行动号召。"
    );
  });
});
