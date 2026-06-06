import type { SearchResult } from "@/lib/search/types";
import { benchmarkSummaryResponseSchema } from "../schemas";
import { WRITING_SYSTEM_PROMPT } from "./system";

function stripHtml(input: string) {
  return input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(input: string, maxLength: number) {
  return input.length > maxLength ? `${input.slice(0, maxLength)}...` : input;
}

function formatMetrics(result: SearchResult) {
  const metrics = result.engagementMetrics;

  if (!metrics) {
    return "无互动数据";
  }

  return [
    metrics.readCount !== undefined ? `读 ${metrics.readCount}` : "",
    metrics.likeCount !== undefined ? `赞 ${metrics.likeCount}` : "",
    metrics.collectCount !== undefined ? `藏 ${metrics.collectCount}` : "",
    metrics.commentCount !== undefined ? `评 ${metrics.commentCount}` : "",
  ].filter(Boolean).join(" / ");
}

function formatArticle(result: SearchResult, index: number) {
  return [
    `对标 ${index + 1}`,
    `url: ${result.url}`,
    `标题：${result.title}`,
    `摘要：${result.snippet}`,
    `互动：${formatMetrics(result)}`,
    result.qualitySignals?.reasons?.length
      ? `选择理由：${result.qualitySignals.reasons.join("、")}`
      : "",
    result.comments?.length
      ? `高赞评论：${result.comments
          .slice(0, 5)
          .map((comment) => comment.content)
          .join(" / ")}`
      : "",
    result.articleHtml
      ? `正文文本：${truncate(stripHtml(result.articleHtml), 2500)}`
      : "",
  ].filter(Boolean).join("\n");
}

export function buildBenchmarkSummaryPrompt(results: SearchResult[]) {
  return {
    systemPrompt: WRITING_SYSTEM_PROMPT,
    userPrompt: [
      "你现在只做公众号对标拆解总结，不写正文。",
      "请把下面的深拆文章压缩成可供正文生成吸收的 benchmarkSummary。",
      "重点判断：真实用户卡点、文章结构模式、排版节奏、评论区洞察、可复用角度、不能照搬的内容。",
      "必须保留每篇文章的 url，summaries 数组长度必须与输入文章数量一致。",
      "",
      "=== 深拆文章 ===",
      ...results.map(formatArticle),
      "",
      "=== 输出要求 ===",
      "1. userPain 写用户真实卡点，不要写空泛主题。",
      "2. structurePattern 写文章推进结构，例如：场景开头 -> 误区反转 -> 方法拆解 -> 结尾号召。",
      "3. rhythmNotes 写短段、加粗、提问、判断句、评论互动等节奏特征。",
      "4. commentInsights 提炼评论区真实需求，最多 3 条。",
      "5. reusableAngles 写我们可复用的切入角度，最多 3 条。",
      "6. avoidCopying 写不能照搬的原文、经历、身份、数据或大号红利，最多 3 条。",
    ].join("\n"),
    outputSchema: benchmarkSummaryResponseSchema,
  };
}
