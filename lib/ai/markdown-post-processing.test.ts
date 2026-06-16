import { describe, expect, it } from "vitest";
import {
  protectMaterialPlaceholders,
  restoreMaterialPlaceholders,
  validateMarkdownPostProcessing,
} from "./markdown-post-processing";

const source = [
  "真正的问题不是模型，而是你还没有跑通主流程。",
  "很多人一上来就追求最强配置，最后连用户为什么离开都不知道。",
  "【💡需要你补充：第一次发现这个问题的真实场景】",
].join("\n\n");

describe("validateMarkdownPostProcessing", () => {
  it("protects material placeholders with tokens and restores them exactly", () => {
    const protectedDraft = protectMaterialPlaceholders(source);

    expect(protectedDraft.content).not.toContain("【💡需要你补充：");
    expect(protectedDraft.content).toContain("MATERIALSLOT000DO_NOTEDIT");
    expect(
      restoreMaterialPlaceholders(
        `## 真正的问题\n\n${protectedDraft.content}`,
        protectedDraft.placeholders
      )
    ).toContain("【💡需要你补充：第一次发现这个问题的真实场景】");
  });

  it("refuses to restore a missing or duplicated placeholder token", () => {
    const protectedDraft = protectMaterialPlaceholders(source);
    const token = protectedDraft.placeholders[0]?.token ?? "";

    expect(
      restoreMaterialPlaceholders(
        protectedDraft.content.replace(token, ""),
        protectedDraft.placeholders
      )
    ).toBeNull();
    expect(
      restoreMaterialPlaceholders(
        `${protectedDraft.content}\n\n${token}`,
        protectedDraft.placeholders
      )
    ).toBeNull();
  });

  it("accepts Markdown layout that preserves the source", () => {
    const result = validateMarkdownPostProcessing(
      source,
      [
        "## 真正的问题，不是模型",
        "",
        "**真正的问题不是模型，而是你还没有跑通主流程。**",
        "",
        "> 很多人一上来就追求最强配置，最后连用户为什么离开都不知道。",
        "",
        "【💡需要你补充：第一次发现这个问题的真实场景】",
      ].join("\n")
    );

    expect(result).toEqual({ ok: true });
  });

  it("rejects a plain-text echo that contains no meaningful Markdown structure", () => {
    expect(validateMarkdownPostProcessing(source, source)).toEqual({
      ok: false,
      reason: "insufficient_markdown_structure",
    });
  });

  it("rejects a long draft that only adds modules but leaves section titles as plain paragraphs", () => {
    const longSource = [
      "模型越新，排队越久",
      "上周二下午三点，我卡在一个 bug 上，想着用新模型救个急。",
      "国产AI套餐的算力潜规则",
      "你以为买了套餐就稳了？太天真了。不同档位的算力分配，水很深。",
      "模型实测：能抢到的才算数",
      "聊模型实测，别跟我扯跑分。我就问你：工作日白天，能不能稳定调用？",
      "套餐选择：别为用不上的性能买单",
      "别追最高配置，算你每天真正能用到的稳定时长。",
      "你的套餐，吃灰了吗？",
      "现在打开你的套餐后台，看一眼使用率报表。",
    ].join("\n\n");
    const candidate = [
      "模型越新，排队越久",
      "",
      "上周二下午三点，我卡在一个 bug 上，想着用新模型救个急。",
      "",
      ":::quote",
      "eyebrow: 核心观点",
      "quote: 抢不到算力，它就是张空头支票",
      ":::",
      "",
      "国产AI套餐的算力潜规则",
      "",
      "你以为买了套餐就稳了？太天真了。不同档位的算力分配，水很深。",
      "",
      "模型实测：能抢到的才算数",
      "",
      "聊模型实测，别跟我扯跑分。我就问你：工作日白天，能不能稳定调用？",
      "",
      "套餐选择：别为用不上的性能买单",
      "",
      "别追最高配置，算你每天真正能用到的稳定时长。",
      "",
      ":::cta",
      "title: 你的套餐每天能用满几成？",
      "note: 来评论区吐槽。",
      ":::",
    ].join("\n");

    expect(validateMarkdownPostProcessing(longSource, candidate)).toEqual({
      ok: false,
      reason: "insufficient_markdown_structure",
    });
  });

  it.each([
    ["empty", "", "empty"],
    ["dangerous html", `${source}\n<script>alert(1)</script>`, "dangerous_html"],
    ["changed placeholder", source.replace("真实场景", "客户案例"), "placeholder_changed"],
    [
      "substantial content loss",
      "## 真正的问题\n\n主流程很重要。\n\n【💡需要你补充：第一次发现这个问题的真实场景】",
      "content_loss",
    ],
  ])("rejects %s output", (_label, candidate, reason) => {
    expect(validateMarkdownPostProcessing(source, candidate)).toEqual({
      ok: false,
      reason,
    });
  });

  it("accepts content edits that preserve existing advanced module syntax", () => {
    const moduleSource = `:::verdict
eyebrow: 最终判断
title: 结构比颜色重要
body: 模块必须解决阅读任务。
:::`;

    expect(
      validateMarkdownPostProcessing(moduleSource, moduleSource)
    ).toEqual({ ok: true });
  });

  it("allows new modules when every existing module signature is preserved", () => {
    const moduleSource = [
      "## 执行顺序",
      "",
      ":::quote",
      "quote: 先验证流程，再升级配置。",
      ":::",
      "",
      "第一步，检查输入是否完整。",
      "",
      "第二步，验证输出是否符合预期。",
    ].join("\n");
    const candidate = [
      "## 执行顺序",
      "",
      ":::quote",
      "quote: 先验证流程，再升级配置。",
      ":::",
      "",
      ":::checklist[执行检查]",
      "done | 第一步 | 检查输入是否完整。",
      "pending | 第二步 | 验证输出是否符合预期。",
      ":::",
    ].join("\n");

    expect(validateMarkdownPostProcessing(moduleSource, candidate)).toEqual({
      ok: true,
    });
  });

  it.each([
    ["renamed module", ":::summary\neyebrow: 最终判断\ntitle: 结构比颜色重要\nbody: 模块必须解决阅读任务。\n:::"],
    ["changed field key", ":::verdict\nlabel: 最终判断\ntitle: 结构比颜色重要\nbody: 模块必须解决阅读任务。\n:::"],
  ])("rejects %s in existing advanced modules", (_label, candidate) => {
    const moduleSource = `:::verdict
eyebrow: 最终判断
title: 结构比颜色重要
body: 模块必须解决阅读任务。
:::`;

    expect(validateMarkdownPostProcessing(moduleSource, candidate)).toEqual({
      ok: false,
      reason: "module_changed",
    });
  });

  it.each([
    [
      "unknown module",
      `## 判断\n\n**原文不变。**\n\n:::unknown\nbody: 不支持的模块。\n:::`,
    ],
    [
      "missing closing fence",
      ":::verdict\neyebrow: 最终判断\ntitle: 结构比颜色重要\nbody: 模块必须解决阅读任务。",
    ],
  ])("rejects %s as invalid module syntax", (_label, candidate) => {
    expect(validateMarkdownPostProcessing(source, candidate)).toEqual({
      ok: false,
      reason: "invalid_module_syntax",
    });
  });

  it("rejects a syntactically valid module whose fields do not match the renderer contract", () => {
    const candidate = [
      "## 判断",
      "",
      "**真正的问题不是模型，而是你还没有跑通主流程。**",
      "",
      ":::verdict",
      "content: 很多人一上来就追求最强配置，最后连用户为什么离开都不知道。",
      "description: 这里会渲染成空卡片。",
      ":::",
      "",
      "【💡需要你补充：第一次发现这个问题的真实场景】",
    ].join("\n");

    expect(validateMarkdownPostProcessing(source, candidate)).toEqual({
      ok: false,
      reason: "invalid_module_contract",
      detail: "verdict 包含未知字段 content",
    });
  });
});
