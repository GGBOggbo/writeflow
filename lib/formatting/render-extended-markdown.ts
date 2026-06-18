import {
  advancedModuleToMarkdown,
  parseAdvancedMarkdown,
  validateAdvancedModuleNode,
} from "@/lib/markdown/advanced-modules";
import { renderSafeGfm, type GfmTagStyleMap } from "@/lib/markdown/render";
import { renderAdvancedModule } from "./advanced-module-render";
import {
  WRITEFLOW_EDITORIAL_TOKENS as DEFAULT_TOKENS,
  getFormatTokens,
  setFormatTokens,
  resetFormatTokens,
  type FormatTokens,
} from "./format-tokens";

function markdownStyles(T: FormatTokens): GfmTagStyleMap {
  return {
  h1: `margin:32px 0 18px;color:${T.colors.text};font-family:${T.font};font-size:30px;line-height:1.35;font-weight:900;`,
  h2: `margin:30px 0 16px;padding-left:12px;border-left:4px solid ${T.colors.accent};color:${T.colors.text};font-family:${T.font};font-size:24px;line-height:1.4;font-weight:850;`,
  h3: `margin:26px 0 14px;color:${T.colors.accentStrong};font-family:${T.font};font-size:20px;line-height:1.45;font-weight:800;`,
  h4: `margin:22px 0 12px;color:${T.colors.text};font-family:${T.font};font-size:18px;line-height:1.5;font-weight:800;`,
  h5: `margin:20px 0 10px;color:${T.colors.text};font-family:${T.font};font-size:16px;line-height:1.55;font-weight:800;`,
  h6: `margin:18px 0 10px;color:${T.colors.muted};font-family:${T.font};font-size:14px;line-height:1.55;font-weight:800;`,
  p: `margin:14px 0;color:${T.colors.text};font-family:${T.font};font-size:16px;line-height:1.6;text-align:justify;letter-spacing:0.01em;`,
  blockquote: `margin:22px 0;padding:16px 18px;border-left:4px solid ${T.colors.accent};border-radius:${T.radius.small};background:${T.colors.accentSoft};color:${T.colors.accentStrong};font-family:${T.font};`,
  ul: `margin:16px 0;padding-left:24px;color:${T.colors.text};font-family:${T.font};`,
  ol: `margin:16px 0;padding-left:24px;color:${T.colors.text};font-family:${T.font};`,
  li: "margin:7px 0;line-height:1.8;",
  a: `color:${T.colors.accent};font-weight:700;text-decoration:underline;text-decoration-color:${T.colors.border};text-underline-offset:3px;`,
  img: `display:block;max-width:100%;height:auto;margin:20px auto;border-radius:${T.radius.medium};`,
  hr: `margin:28px 0;border:0;border-top:1px solid ${T.colors.border};`,
  table: `width:100%;margin:20px 0;border-collapse:collapse;font-family:${T.font};font-size:14px;`,
  th: `padding:10px;border:1px solid ${T.colors.border};background:${T.colors.accentSoft};color:${T.colors.accentStrong};text-align:left;`,
  td: `padding:10px;border:1px solid ${T.colors.border};color:${T.colors.text};vertical-align:top;`,
  code: `padding:2px 5px;border-radius:4px;background:${T.colors.accentSoft};color:${T.colors.accentStrong};font-size:0.9em;`,
  pre: `margin:20px 0;padding:16px;border-radius:${T.radius.medium};background:#17221d;color:#eef7f2;overflow-x:auto;line-height:1.65;`,
  };
}

const PLACEHOLDER_PATTERN = /【💡需要你补充：([^】]+)】/g;

function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function materialPlaceholderWarning(detail: string) {
  return `<section data-material-placeholder="required" style="margin:22px 0;padding:18px 18px;border:2px solid #f43f5e;border-radius:14px;background:#fff1f2;color:#881337;font-family:${getFormatTokens().font};box-shadow:0 0 0 4px rgba(244,63,94,0.10);"><p style="margin:0 0 8px;font-size:13px;font-weight:900;letter-spacing:0.08em;color:#be123c;">必须补充真实素材</p><p style="margin:0;color:#881337;font-size:15px;line-height:1.8;font-weight:700;">需要你补充：${escapeHtml(detail.trim())}</p><p style="margin:10px 0 0;color:#9f1239;font-size:12px;line-height:1.65;">这不是正文内容。补完真实经历、场景或证据后再复制发布。</p></section>`;
}

function extractGlobalFootnoteDefinitions(markdown: string) {
  const definitions: string[] = [];
  const content = markdown
    .split("\n")
    .filter((line) => {
      if (!/^\[\^[^\]]+\]:\s*/.test(line)) return true;
      definitions.push(line);
      return false;
    })
    .join("\n");

  return { content, definitions: definitions.join("\n") };
}

function detachFootnotes(html: string, collected: Map<string, string>) {
  return html.replace(
    /<section class="footnotes">[\s\S]*?<ol[^>]*>([\s\S]*?)<\/ol>[\s\S]*?<\/section>/g,
    (_section, items: string) => {
      for (const match of items.matchAll(/<li id="([^"]+)"[^>]*>[\s\S]*?<\/li>/g)) {
        if (!collected.has(match[1])) collected.set(match[1], match[0]);
      }
      return "";
    }
  );
}

export function renderExtendedMarkdown(markdown: string, tokens?: FormatTokens) {
  const T = tokens ?? DEFAULT_TOKENS;
  setFormatTokens(T);
  const footnotes = extractGlobalFootnoteDefinitions(markdown);
  const collectedFootnotes = new Map<string, string>();
  const renderMarkdownSegment = (segment: string, includeDefinitions: boolean) =>
    detachFootnotes(
      renderSafeGfm(
        includeDefinitions && footnotes.definitions
          ? `${segment}\n\n${footnotes.definitions}`
          : segment,
        { tagStyles: markdownStyles(T) }
      ),
      collectedFootnotes
    );
  const renderMarkdownNode = (nodeContent: string) => {
    let cursor = 0;
    let usedDefinitions = false;
    const parts: string[] = [];

    for (const match of nodeContent.matchAll(PLACEHOLDER_PATTERN)) {
      const index = match.index ?? 0;
      const before = nodeContent.slice(cursor, index);
      if (before.trim()) {
        parts.push(renderMarkdownSegment(before, !usedDefinitions));
        usedDefinitions = true;
      }
      parts.push(materialPlaceholderWarning(match[1] ?? ""));
      cursor = index + match[0].length;
    }

    const after = nodeContent.slice(cursor);
    if (after.trim() || parts.length === 0) {
      parts.push(renderMarkdownSegment(after, !usedDefinitions));
    }

    return parts.join("");
  };
  const content = parseAdvancedMarkdown(footnotes.content)
    .map((node) => {
      if (node.type !== "module") return renderMarkdownNode(node.content);
      const validation = validateAdvancedModuleNode(node);
      if (validation.ok) {
        return renderAdvancedModule(node);
      }
      // 容错:行型模块被误写成字段型(key: value)时,校验必失败。
      // 这种情况不降级成纯文本(内容会消失),而是渲染格式提示卡,
      // 让用户/AI 立刻发现该用 | 分隔。renderRows 内部会检测并提示。
      const isRowFieldTypeMisuse =
        node.rows.length > 0 &&
        node.rows.every((row) => row.length === 1 && /^[a-z-]+:\s/.test(row[0] ?? ""));
      if (isRowFieldTypeMisuse) {
        return renderAdvancedModule(node);
      }
      return renderMarkdownNode(advancedModuleToMarkdown(node));
    })
    .join("");
  const footnoteHtml = collectedFootnotes.size
    ? `<section class="footnotes" style="margin-top:32px;padding-top:12px;border-top:1px solid ${T.colors.border};font-family:${T.font};color:${T.colors.muted};font-size:13px;"><ol style="margin:0;padding-left:22px;">${[...collectedFootnotes.values()].join("")}</ol></section>`
    : "";

  const themeId: string = tokens === undefined ? "writeflow-editorial" : "custom";
  const article = `<article data-wechat-theme="${themeId}" style="width:100%;max-width:680px;margin:0 auto;padding:12px 26px 36px;box-sizing:border-box;background:${T.colors.surface};color:${T.colors.text};font-family:${T.font};word-break:break-word;overflow-wrap:anywhere;">${content}${footnoteHtml}</article>`;
  resetFormatTokens();
  return article;
}
