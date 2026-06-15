import { describe, expect, it } from "vitest";
import {
  ADVANCED_MODULE_NAMES,
  hasAdvancedModules,
  parseAdvancedMarkdown,
} from "./advanced-modules";

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

  it("recognizes the complete 31-module catalog", () => {
    expect(ADVANCED_MODULE_NAMES).toHaveLength(31);

    for (const name of ADVANCED_MODULE_NAMES) {
      const markdown = `:::${name}\nvalue: 示例\n:::`;
      const nodes = parseAdvancedMarkdown(markdown);

      expect(nodes).toHaveLength(1);
      expect(nodes[0]).toMatchObject({ type: "module", name });
      expect(hasAdvancedModules(markdown)).toBe(true);
    }
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
});
