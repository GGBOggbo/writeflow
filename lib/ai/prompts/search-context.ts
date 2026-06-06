import type { SearchResult } from "@/lib/search/types";

function formatSourceLabel(source: SearchResult["source"]) {
  switch (source) {
    case "generic":
      return "Bocha/Web";
    case "wechat":
      return "公众号";
    case "xiaohongshu":
      return "小红书";
    case "hotlist":
      return "热榜";
    default:
      return source;
  }
}

function formatEngagement(result: SearchResult) {
  const metrics = result.engagementMetrics;

  if (!metrics) {
    return "";
  }

  const parts = [
    metrics.readCount !== undefined ? `读 ${metrics.readCount}` : null,
    metrics.likeCount !== undefined ? `赞 ${metrics.likeCount}` : null,
    metrics.lookingCount !== undefined ? `在看 ${metrics.lookingCount}` : null,
    metrics.shareCount !== undefined ? `转 ${metrics.shareCount}` : null,
    metrics.collectCount !== undefined ? `藏 ${metrics.collectCount}` : null,
    metrics.commentCount !== undefined ? `评 ${metrics.commentCount}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? `（${parts.join(" / ")}）` : "";
}

const RHYTHM_SIGNAL_TERMS = [
  "不是",
  "其实",
  "真正",
  "很多人",
  "为什么",
  "怎么办",
  "卡住",
  "焦虑",
  "没人",
  "不会",
  "最后",
  "发现",
];

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(input: string) {
  return decodeHtmlEntities(input)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(input: string, maxLength: number) {
  return input.length > maxLength ? `${input.slice(0, maxLength)}...` : input;
}

function extractBlocks(html: string) {
  const blocks = Array.from(
    html.matchAll(
      /<(p|h1|h2|h3|h4|li|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi
    )
  )
    .map((match) => stripHtml(match[2] ?? ""))
    .filter((block) => block.length >= 6);

  if (blocks.length > 0) {
    return blocks;
  }

  return stripHtml(html)
    .split(/[。！？!?]\s*/)
    .map((block) => block.trim())
    .filter((block) => block.length >= 6);
}

function extractBoldTexts(html: string) {
  return Array.from(html.matchAll(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi))
    .map((match) => stripHtml(match[2] ?? ""))
    .filter((text) => text.length >= 6);
}

function pickSignalBlock(blocks: string[]) {
  return (
    blocks.find((block) =>
      RHYTHM_SIGNAL_TERMS.some((term) => block.includes(term))
    ) ?? blocks[Math.min(1, blocks.length - 1)]
  );
}

function formatArticleRhythm(html: string) {
  const blocks = extractBlocks(html);

  if (blocks.length === 0) {
    return "";
  }

  const boldTexts = extractBoldTexts(html);
  const shortBlocks = blocks.filter((block) => block.length <= 38).length;
  const shortBlockRatio = Math.round((shortBlocks / blocks.length) * 100);
  const samples = [
    `开头：${truncate(blocks[0] ?? "", 70)}`,
    `痛点/判断：${truncate(pickSignalBlock(blocks), 80)}`,
    boldTexts.length > 0
      ? `加粗金句：${truncate(boldTexts[0] ?? "", 80)}`
      : "",
    blocks.length > 1
      ? `结尾：${truncate(blocks[blocks.length - 1] ?? "", 70)}`
      : "",
  ].filter(Boolean);

  return [
    `正文节奏样本：${samples.join(" | ")}`,
    `排版信号：共 ${blocks.length} 段，短段占比约 ${shortBlockRatio}%，加粗 ${boldTexts.length} 处`,
  ].join("\n   ");
}

export function formatSearchReference(result: SearchResult, index: number) {
  const metadataLines = [
    `   链接：${result.url}`,
    result.publishedAt ? `   发布时间：${result.publishedAt}` : "",
    result.notes && result.notes.length > 0
      ? `   来源备注：${result.notes.join("、")}`
      : "",
    result.seoKeywords && result.seoKeywords.length > 0
      ? `   单篇关键词：${result.seoKeywords.join("、")}`
      : "",
    result.crowdedness ? `   拥挤度：${result.crowdedness}` : "",
    result.staleBuzzwords && result.staleBuzzwords.length > 0
      ? `   疲劳词：${result.staleBuzzwords.join("、")}`
      : "",
  ].filter(Boolean);
  const extraLines = [
    result.qualitySignals?.reasons && result.qualitySignals.reasons.length > 0
      ? `   深拆理由：${result.qualitySignals.reasons.join("、")}`
      : "",
    result.articleHtml
      ? `   ${formatArticleRhythm(result.articleHtml)}`
      : "",
    result.comments && result.comments.length > 0
      ? `   高赞评论：${result.comments
          .slice(0, 3)
          .map((comment) => truncate(comment.content, 80))
          .join(" / ")}`
      : "",
  ].filter(Boolean);

  return [
    `${index + 1}. [${formatSourceLabel(result.source)}] ${result.title}${formatEngagement(result)}`,
    `   ${result.snippet}`,
    ...metadataLines,
    ...extraLines,
  ].join("\n");
}
