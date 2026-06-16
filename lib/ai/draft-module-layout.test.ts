import { describe, expect, it, vi } from "vitest";
import { renderExtendedMarkdown } from "@/lib/formatting/render-extended-markdown";
import { validateMarkdownPostProcessing } from "./markdown-post-processing";
import {
  buildBasicMarkdownFallback,
  layoutDraftModules,
} from "./draft-module-layout";

const plainDraft = [
  "真正的问题不是模型，而是主流程还没跑通。",
  "很多人一上来就追求最强配置，最后连用户为什么离开都不知道。",
  "先验证用户路径，再考虑模型配置。",
].join("\n\n");

describe("layoutDraftModules", () => {
  it("passes the AI Markdown output through without validation, retry, or fallback", async () => {
    const aiOutput = [
      ":::verdict",
      "content: 这是新提示词正在测试的字段",
      "description: 代码不要拦截",
      ":::",
      "",
      "<custom-html>也先保留给提示词测试</custom-html>",
    ].join("\n");
    const format = vi.fn().mockResolvedValue(aiOutput);

    const result = await layoutDraftModules(plainDraft, format);

    expect(result).toMatchObject({
      content: aiOutput,
      source: "ai",
      attempts: 1,
      failures: [],
      degradedModules: 0,
      degradationReasons: [],
    });
    expect(format).toHaveBeenCalledTimes(1);
    expect(format).toHaveBeenCalledWith(plainDraft);
  });

  it("does not protect or rewrite material placeholders before sending content to the AI", async () => {
    const source = `${plainDraft}\n\n【💡需要你补充：第一次发现问题的真实场景】`;
    const aiOutput = "AI 自己决定是否保留占位符。";
    const format = vi.fn().mockResolvedValue(aiOutput);

    const result = await layoutDraftModules(source, format);

    expect(format).toHaveBeenCalledWith(source);
    expect(result.content).toBe(aiOutput);
    expect(result.content).not.toContain("【💡需要你补充");
  });

  it("bubbles provider errors instead of replacing them with local Markdown", async () => {
    const format = vi.fn().mockRejectedValue(new Error("provider unavailable"));

    await expect(layoutDraftModules(plainDraft, format)).rejects.toThrow(
      "provider unavailable"
    );
  });

  it("still reports module stats for observability without changing content", async () => {
    const formatted = [
      ":::quote",
      "quote: 先验证流程，再升级配置。",
      ":::",
      "",
      ":::cta",
      "title: 留言说说你卡在哪一步",
      ":::",
    ].join("\n");

    const result = await layoutDraftModules(
      plainDraft,
      vi.fn().mockResolvedValue(formatted)
    );

    expect(result.moduleCount).toBe(2);
    expect(result.moduleNames).toEqual(["quote", "cta"]);
    expect(result.ctaCount).toBe(1);
    expect(result.content).toBe(formatted);
  });
});

describe("buildBasicMarkdownFallback", () => {
  it("promotes existing text into Markdown without inventing article content", () => {
    const result = buildBasicMarkdownFallback(plainDraft);

    expect(result).toContain("## ");
    expect(result).toContain("**");
    expect(validateMarkdownPostProcessing(plainDraft, result)).toEqual({
      ok: true,
    });
    expect(renderExtendedMarkdown(result)).not.toContain("&gt; &gt;");
  });

  it("promotes standalone section-title paragraphs instead of leaving long drafts flat", () => {
    const source = [
      "模型越新，排队越久",
      "上周二下午三点，我卡在一个 bug 上，想着用新模型救个急。",
      "国产AI套餐的算力潜规则",
      "你以为买了套餐就稳了？",
      "太天真了。不同档位的算力分配，水很深。",
      "模型实测：能抢到的才算数",
      "聊模型实测，别跟我扯跑分。我就问你：工作日白天，能不能稳定调用？",
      "套餐选择：别为用不上的性能买单",
      "别追最高配置，算你每天真正能用到的稳定时长。",
    ].join("\n\n");

    const result = buildBasicMarkdownFallback(source);

    expect(result).toContain("## 模型越新，排队越久");
    expect(result).toContain("## 国产AI套餐的算力潜规则");
    expect(result).toContain("## 模型实测：能抢到的才算数");
    expect(result).toContain("## 套餐选择：别为用不上的性能买单");
    expect(validateMarkdownPostProcessing(source, result)).toEqual({
      ok: true,
    });
  });

  it("continues normalizing a valid draft that still has naked section titles", () => {
    const source = [
      "## 模型越新，排队越久",
      "**上周二下午三点，我卡在一个 bug 上，想着用新模型救个急。**",
      "国产AI套餐的算力潜规则",
      "## 你以为买了套餐就稳了？",
      "太天真了。不同档位的算力分配，水很深。",
    ].join("\n\n");

    const result = buildBasicMarkdownFallback(source);

    expect(result).toContain("## 国产AI套餐的算力潜规则");
    expect(result).not.toContain("## 你以为买了套餐就稳了？");
    expect(result).toContain("你以为买了套餐就稳了？");
  });

  it("preserves existing module labels during local fallback", () => {
    const source = [
      ":::quote",
      "eyebrow: 核心观点",
      "quote: 抢不到算力，它就是张空头支票。",
      ":::",
      "",
      ":::verdict",
      "eyebrow: 关键判断",
      "title: 稳定调用才算可用",
      "body: 参数再强，排队时也无法完成工作。",
      ":::",
      "",
      ":::summary",
      "eyebrow: 本周复盘",
      "title: 真实使用率",
      "body: 看高峰期响应，不只看套餐额度。",
      ":::",
    ].join("\n");

    const result = buildBasicMarkdownFallback(source);

    expect(result).toContain("eyebrow: 核心观点");
    expect(result).toContain("eyebrow: 关键判断");
    expect(result).toContain("eyebrow: 本周复盘");
  });

  it("keeps an existing advanced module byte-for-byte while normalizing surrounding text", () => {
    const existingModule = [
      ":::quote",
      "eyebrow: 核心观点",
      "quote: 抢不到算力，它就是张空头支票。",
      ":::",
    ].join("\n");
    const source = [
      "模型越新，排队越久",
      "上周二下午三点，我卡在一个 bug 上。",
      existingModule,
      "套餐选择：别为用不上的性能买单",
      "先看每天真正能用到的稳定时长。",
    ].join("\n\n");

    const result = buildBasicMarkdownFallback(source);

    expect(result).toContain(existingModule);
    expect(validateMarkdownPostProcessing(source, result)).toEqual({ ok: true });
  });
});
