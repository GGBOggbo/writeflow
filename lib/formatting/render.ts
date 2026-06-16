import type {
  FormattingBlock,
  WechatFormatTheme,
} from "@/types/workflow";
import { renderSafeGfm, type GfmTagStyleMap } from "@/lib/markdown/render";
import { WECHAT_THEME_TOKENS } from "./themes";
import { composeFormattingBlocks } from "./composition";
import {
  FREE_AI_THEME_SPECS,
  isFreeAiTheme,
  type FreeAiThemeId,
} from "./free-ai-themes";

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderLegacyList(
  text: string,
  color: string,
  accent: string,
  textFont: string
) {
  return text
    .split("\n")
    .filter((line) => line.trim())
    .map(
      (line) =>
        '<p style="font-family:' +
        textFont +
        ' !important;margin:0 0 11px 0;font-size:15px;line-height:1.85;color:' +
        color +
        ';"><span style="color:' +
        accent +
        ';font-weight:700;">&#8226;</span>&nbsp;&nbsp;' +
        escapeHtml(line.trim()) +
        "</p>"
    )
    .join("");
}

function hasBlockMarkdown(text: string) {
  return /^(?:#{1,6}\s|>\s|[-*+]\s|\d+\.\s|```|~~~|\|.+\||\s*[-*_]{3,}\s*$)/m.test(
    text
  );
}

function paragraphMarkdown(text: string) {
  return hasBlockMarkdown(text) ? text : text.replace(/\n[ \t]*\n+/g, "");
}

function withoutOuterQuoteMarks(text: string) {
  const trimmed = text.trim();
  return /^[“”"][\s\S]*[“”"]$/.test(trimmed)
    ? trimmed.slice(1, -1).trim()
    : text;
}

function quoteContent(text: string) {
  return withoutOuterQuoteMarks(text)
    .split("\n")
    .map((line) => line.replace(/^\s*(?:>\s*)+/, ""))
    .join("\n")
    .trim();
}

function baseTagStyles(
  theme: WechatFormatTheme,
  paragraphStyle: string
): GfmTagStyleMap {
  const tokens = WECHAT_THEME_TOKENS[theme];
  return {
    p: paragraphStyle,
    h1: `font-family:${tokens.headingFont};margin:0 0 14px;font-size:24px;line-height:1.5;color:${tokens.headingText};font-weight:800;`,
    h2: `font-family:${tokens.headingFont};margin:0 0 12px;font-size:21px;line-height:1.55;color:${tokens.headingText};font-weight:750;`,
    h3: `font-family:${tokens.headingFont};margin:0 0 10px;font-size:18px;line-height:1.6;color:${tokens.headingText};font-weight:700;`,
    h4: `font-family:${tokens.headingFont};margin:0 0 8px;font-size:16px;line-height:1.7;color:${tokens.headingText};font-weight:700;`,
    h5: `font-family:${tokens.headingFont};margin:0 0 8px;font-size:15px;line-height:1.7;color:${tokens.headingText};font-weight:700;`,
    h6: `font-family:${tokens.headingFont};margin:0 0 8px;font-size:14px;line-height:1.7;color:${tokens.muted};font-weight:700;`,
    strong: `font-weight:700;color:${tokens.headingText};`,
    em: "font-style:italic;",
    del: `color:${tokens.muted};text-decoration:line-through;`,
    blockquote: `margin:18px 0;padding:6px 0 6px 14px;border-left:3px solid ${tokens.quoteBorder};color:${tokens.quoteText};`,
    ul: "margin:12px 0;padding-left:24px;list-style-type:disc;",
    ol: "margin:12px 0;padding-left:24px;list-style-type:decimal;",
    li: `font-family:${tokens.textFont} !important;margin:6px 0;font-size:15px;line-height:1.85;color:${tokens.text};`,
    input: "margin:0 7px 0 0;vertical-align:middle;",
    a: `color:${tokens.accentDark};text-decoration:underline;`,
    img: "max-width:100%;height:auto;display:block;margin:20px auto;",
    hr: `margin:28px 0;border:0;border-top:1px solid ${tokens.divider};`,
    table: `width:100%;margin:20px 0;border-collapse:collapse;font-family:${tokens.textFont};font-size:14px;line-height:1.6;color:${tokens.text};`,
    thead: "background:#f7f7f5;",
    th: `padding:9px 10px;border:1px solid ${tokens.comparisonBorder};text-align:left;font-weight:700;color:${tokens.headingText};`,
    td: `padding:9px 10px;border:1px solid ${tokens.comparisonBorder};text-align:left;`,
    code: "font-family:Menlo,Monaco,Consolas,monospace;font-size:13px;background:#f3f4f6;padding:2px 5px;",
    pre: "margin:20px 0;padding:16px;overflow-x:auto;background:#1f2933;color:#f8fafc;line-height:1.65;white-space:pre;",
  };
}

function renderMarkdown(
  text: string,
  theme: WechatFormatTheme,
  paragraphStyle: string,
  extraStyles: GfmTagStyleMap = {}
) {
  return renderSafeGfm(text, {
    tagStyles: {
      ...baseTagStyles(theme, paragraphStyle),
      ...extraStyles,
    },
  });
}

function renderHero(text: string, theme: WechatFormatTheme) {
  const tokens = WECHAT_THEME_TOKENS[theme];
  const isEditorial = theme === "editorial-paper";
  const content = renderMarkdown(
    text,
    theme,
    `margin:0;font-family:${tokens.headingFont} !important;font-size:27px;font-weight:800;line-height:1.45;color:${tokens.headingText};`,
    {
      h1: `margin:0;font-family:${tokens.headingFont};font-size:29px;font-weight:800;line-height:1.42;color:${tokens.headingText};`,
      h2: `margin:0;font-family:${tokens.headingFont};font-size:27px;font-weight:800;line-height:1.45;color:${tokens.headingText};`,
      h3: `margin:0;font-family:${tokens.headingFont};font-size:24px;font-weight:750;line-height:1.5;color:${tokens.headingText};`,
    }
  );

  return `<section data-format-block="heading" data-layout-module="hero" style="margin:0 0 38px;padding:${isEditorial ? "0 0 25px" : "28px 24px"};background:${isEditorial ? "transparent" : tokens.accentSoft};border-top:${isEditorial ? `4px solid ${tokens.accent}` : "0"};border-bottom:1px solid ${tokens.headingRule};border-radius:${isEditorial ? "0" : tokens.cardRadius};">${content}</section>`;
}

function renderPart(
  text: string,
  theme: WechatFormatTheme,
  index: number,
  label?: string
) {
  const tokens = WECHAT_THEME_TOKENS[theme];
  const content = renderMarkdown(
    text,
    theme,
    `margin:0;font-family:${tokens.headingFont} !important;font-size:22px;font-weight:750;line-height:1.5;color:${tokens.headingText};`,
    {
      h1: `margin:0;font-family:${tokens.headingFont};font-size:24px;font-weight:800;line-height:1.45;color:${tokens.headingText};`,
      h2: `margin:0;font-family:${tokens.headingFont};font-size:22px;font-weight:750;line-height:1.5;color:${tokens.headingText};`,
      h3: `margin:0;font-family:${tokens.headingFont};font-size:20px;font-weight:700;line-height:1.55;color:${tokens.headingText};`,
    }
  );

  return `<section data-format-block="heading" data-layout-module="part" style="margin:46px 0 28px;padding:0 0 15px;border-bottom:1px solid ${tokens.headingRule};"><div style="display:flex;align-items:flex-start;gap:15px;"><span style="flex:none;font-family:${tokens.headingFont};font-size:30px;font-weight:800;line-height:1;color:${tokens.accent};">${escapeHtml(label ?? String(index).padStart(2, "0"))}</span><div style="min-width:0;flex:1;">${content}</div></div></section>`;
}

function renderBlock(
  block: FormattingBlock,
  theme: WechatFormatTheme,
  headingIndex: number,
  partLabel?: string
) {
  const tokens = WECHAT_THEME_TOKENS[theme];
  const isEditorial = theme === "editorial-paper";

  switch (block.type) {
    case "heading":
      return headingIndex === 0
        ? renderHero(block.text, theme)
        : renderPart(block.text, theme, headingIndex, partLabel);
    case "quote": {
      const inner = renderMarkdown(
        quoteContent(block.text),
        theme,
        `margin:0;font-family:${tokens.headingFont} !important;font-size:20px;font-weight:700;line-height:1.75;color:${tokens.quoteText};`
      );
      return `<section data-format-block="quote" data-layout-module="quote-card" style="margin:32px 0;padding:${isEditorial ? "20px 0 20px 22px" : "24px 22px"};background:${isEditorial ? "transparent" : tokens.quoteBackground};border-left:5px solid ${tokens.quoteBorder};border-radius:${isEditorial ? "0" : "12px"};">${inner}</section>`;
    }
    case "pain": {
      const inner = renderMarkdown(
        block.text,
        theme,
        `font-family:${tokens.textFont} !important;margin:0;font-size:15px;font-weight:600;line-height:1.9;color:${tokens.painText};`
      );
      const prefixed = inner.replace(
        /(<p\b[^>]*>)/,
        `$1<span style="color:${tokens.painBorder};">⚠ </span>`
      );
      return `<section data-format-block="pain" data-layout-module="callout" style="margin:28px 0;padding:18px 20px;background:${tokens.painBackground};border-top:1px solid ${tokens.painBorder};border-bottom:1px solid ${tokens.painBorder};border-radius:${isEditorial ? "0" : "10px"};">${prefixed}</section>`;
    }
    case "transition":
      return `<section data-format-block="transition" data-layout-module="bridge" style="margin:36px 0;text-align:center;">${renderMarkdown(block.text, theme, `font-family:${tokens.textFont} !important;margin:0;font-size:14px;font-weight:600;line-height:1.8;color:${tokens.muted};`, {
        hr: `margin:0;border:0;height:1px;background:linear-gradient(90deg, transparent, ${tokens.divider}, transparent);`,
      })}</section>`;
    case "list":
      return `<section data-format-block="list" data-layout-module="list-panel" style="margin:28px 0;padding:20px;background:${tokens.listBackground};border-top:3px solid ${tokens.accent};border-radius:${isEditorial ? "0" : "10px"};">${hasBlockMarkdown(block.text) ? renderMarkdown(block.text, theme, `font-family:${tokens.textFont} !important;margin:0 0 11px;font-size:15px;line-height:1.85;color:${tokens.text};`) : renderLegacyList(block.text, tokens.text, tokens.accent, tokens.textFont)}</section>`;
    case "comparison":
      return `<section data-format-block="comparison" data-layout-module="comparison-panel" style="margin:30px 0;padding:20px;background:${tokens.comparisonBackground};border-top:3px solid ${tokens.accent};border-bottom:1px solid ${tokens.comparisonBorder};border-radius:${isEditorial ? "0" : "10px"};">${renderMarkdown(block.text, theme, `font-family:${tokens.textFont} !important;margin:0;font-size:15px;line-height:1.9;color:${tokens.text};`)}</section>`;
    case "cta":
      return `<section data-format-block="cta" data-layout-module="cta" style="margin:48px 0 8px;padding:27px 22px;background:${isEditorial ? "transparent" : `linear-gradient(135deg, ${tokens.ctaGradientFrom}, ${tokens.ctaGradientTo})`};border-top:1px solid ${tokens.ctaBorder};border-bottom:1px solid ${tokens.ctaBorder};border-radius:${isEditorial ? "0" : tokens.cardRadius};text-align:center;">${renderMarkdown(block.text, theme, `font-family:${tokens.textFont} !important;margin:0;font-size:16px;font-weight:700;line-height:1.8;color:${isEditorial ? tokens.ctaText : "#ffffff"};`)}</section>`;
    default:
      return `<section data-format-block="paragraph">${renderMarkdown(paragraphMarkdown(block.text), theme, `font-family:${tokens.textFont} !important;margin:0 0 20px;font-size:16px;line-height:${isEditorial ? "1.85" : "2"};color:${tokens.text};`)}</section>`;
  }
}

type LayoutBlock = {
  block: FormattingBlock;
  partLabel?: string;
};

function numericHeadingLabel(text: string) {
  const normalized = text.replace(/^#{1,6}\s*/, "").trim();
  const match = normalized.match(/^(\d{1,2}|[一二三四五六七八九十]+)[.、]?$/);
  return match?.[1];
}

function chapterHeadingParts(text: string) {
  const normalized = text.replace(/^#{1,6}\s*/, "").trim();
  const match = normalized.match(
    /^(\d{1,2}|[一二三四五六七八九十]+)[.、\s]+([\s\S]+)$/
  );
  if (!match) return null;
  return { label: match[1], title: match[2].trim() };
}

function displayPartLabel(label: string) {
  return /^\d+$/.test(label) ? label.padStart(2, "0") : label;
}

function prepareLayoutBlocks(blocks: FormattingBlock[]): LayoutBlock[] {
  const composed = composeFormattingBlocks(blocks);
  const prepared: LayoutBlock[] = [];

  for (let index = 0; index < composed.length; index += 1) {
    const block = composed[index];
    const label = block.type === "heading" ? numericHeadingLabel(block.text) : undefined;
    const next = composed[index + 1];

    const hasHero = prepared.some((item) => item.block.type === "heading");

    if (label && next?.type === "heading" && hasHero) {
      const nextParts = chapterHeadingParts(next.text);
      prepared.push({
        block: nextParts ? { ...next, text: nextParts.title } : next,
        partLabel: displayPartLabel(label),
      });
      index += 1;
      continue;
    }

    if (block.type === "heading" && hasHero) {
      const parts = chapterHeadingParts(block.text);
      if (parts) {
        prepared.push({
          block: { ...block, text: parts.title },
          partLabel: displayPartLabel(parts.label),
        });
        continue;
      }
    }

    prepared.push({ block });
  }

  return prepared;
}

function freeAiTagStyles(theme: FreeAiThemeId): GfmTagStyleMap {
  const spec = FREE_AI_THEME_SPECS[theme];
  const headingFont = spec.heading.fontFamily;
  const textStyle = `font-family:${spec.fontFamily} !important;margin:0 0 18px;font-size:${spec.layout.bodyFontSize};line-height:${spec.layout.lineHeight};letter-spacing:${spec.layout.letterSpacing};color:${spec.colors.text};`;

  return {
    p: textStyle,
    h1: `font-family:${headingFont} !important;margin:0 0 20px;font-size:26px;line-height:1.45;color:${spec.heading.h2Color};font-weight:${spec.heading.fontWeight ?? "800"};`,
    h2: `font-family:${headingFont} !important;margin:0 0 20px;padding:0 0 12px;font-size:22px;line-height:1.5;color:${spec.heading.h2Color};font-weight:${spec.heading.fontWeight ?? "750"};border-bottom:${spec.heading.h2Border};`,
    h3: `font-family:${headingFont} !important;margin:24px 0 14px;padding:0 0 8px;font-size:18px;line-height:1.6;color:${spec.heading.h3Color};font-weight:${spec.heading.fontWeight ?? "700"};border-bottom:2px solid ${spec.colors.primary};`,
    h4: `font-family:${headingFont} !important;margin:20px 0 12px;font-size:17px;line-height:1.65;color:${spec.heading.h3Color};font-weight:${spec.heading.fontWeight ?? "700"};`,
    h5: `font-family:${headingFont} !important;margin:18px 0 10px;font-size:16px;line-height:1.7;color:${spec.heading.h3Color};font-weight:${spec.heading.fontWeight ?? "700"};`,
    h6: `font-family:${headingFont} !important;margin:18px 0 10px;font-size:15px;line-height:1.7;color:${spec.colors.secondary};font-weight:${spec.heading.fontWeight ?? "700"};`,
    strong: `font-weight:700;color:${spec.colors.secondary};`,
    em: "font-style:italic;",
    del: `color:${spec.colors.text};text-decoration:line-through;opacity:0.68;`,
    blockquote: `font-family:${spec.fontFamily} !important;margin:22px 0;padding:16px 18px;background:${spec.colors.quote};border-left:5px solid ${spec.colors.primary};box-shadow:${spec.quote.shadow};color:${spec.colors.text};`,
    ul: "margin:14px 0;padding-left:24px;list-style-type:disc;",
    ol: "margin:14px 0;padding-left:24px;list-style-type:decimal;",
    li: `font-family:${spec.fontFamily} !important;margin:7px 0;font-size:${spec.layout.bodyFontSize};line-height:${spec.layout.lineHeight};color:${spec.colors.text};`,
    input: "margin:0 7px 0 0;vertical-align:middle;",
    a: `color:${spec.colors.secondary};text-decoration:underline;`,
    img: "max-width:100%;height:auto;display:block;margin:22px auto;",
    hr: `margin:28px 0;border:0;height:1px;background:${spec.divider.background};`,
    table: `width:100%;margin:20px 0;border-collapse:collapse;font-family:${spec.fontFamily};font-size:14px;line-height:1.65;color:${spec.colors.text};`,
    thead: `background:${spec.colors.quote};`,
    th: `padding:9px 10px;border:1px solid ${spec.colors.primary};text-align:left;font-weight:700;color:${spec.colors.secondary};`,
    td: `padding:9px 10px;border:1px solid ${spec.colors.primary};text-align:left;color:${spec.colors.text};`,
    code: `font-family:Menlo,Monaco,Consolas,monospace;font-size:13px;background:${spec.colors.quote};padding:2px 5px;color:${spec.colors.secondary};`,
    pre: "margin:20px 0;padding:16px;overflow-x:auto;background:#1f2933;color:#f8fafc;line-height:1.65;white-space:pre;",
  };
}

function renderFreeAiMarkdown(
  text: string,
  theme: FreeAiThemeId,
  extraStyles: GfmTagStyleMap = {}
) {
  return renderSafeGfm(text, {
    tagStyles: {
      ...freeAiTagStyles(theme),
      ...extraStyles,
    },
  });
}

function freeAiHeadingText(text: string) {
  return text.replace(/^#{1,6}\s*/, "").trim();
}

function renderFreeAiBlock(block: FormattingBlock, theme: FreeAiThemeId) {
  const spec = FREE_AI_THEME_SPECS[theme];
  const paragraphStyle = freeAiTagStyles(theme).p;

  switch (block.type) {
    case "heading":
      return `<div data-format-block="heading" data-layout-module="part"><h2 style="font-family:${spec.heading.fontFamily} !important;margin:0 0 20px;padding:0 0 12px;font-size:22px;line-height:1.5;color:${spec.heading.h2Color};font-weight:${spec.heading.fontWeight ?? "750"};border-bottom:${spec.heading.h2Border};"><span style="display:inline-block;margin-right:10px;color:${spec.colors.primary};text-shadow:${spec.heading.symbolShadow};">${spec.heading.symbol}</span><span>${escapeHtml(freeAiHeadingText(block.text))}</span></h2></div>`;
    case "quote":
      return `<div data-format-block="quote" data-layout-module="quote-card">${renderFreeAiMarkdown(`> ${quoteContent(block.text)}`, theme)}</div>`;
    case "pain":
      return `<div data-format-block="pain" data-layout-module="callout">${renderFreeAiMarkdown(`> **${block.text}**`, theme)}</div>`;
    case "transition": {
      const isDivider = /^\s*[-*_]{3,}\s*$/.test(block.text);
      return `<div data-format-block="transition" data-layout-module="bridge">${renderFreeAiMarkdown(isDivider ? "---" : `---\n\n${block.text}`, theme, {
        p: `${paragraphStyle}text-align:center;font-size:14px;color:${spec.colors.secondary};`,
      })}</div>`;
    }
    case "list":
      return `<div data-format-block="list" data-layout-module="list-panel">${renderFreeAiMarkdown(hasBlockMarkdown(block.text) ? block.text : block.text.split("\n").filter(Boolean).map((line) => `- ${line}`).join("\n"), theme)}</div>`;
    case "comparison":
      return `<div data-format-block="comparison" data-layout-module="comparison-panel">${renderFreeAiMarkdown(block.text, theme)}</div>`;
    case "cta":
      return `<div data-format-block="cta" data-layout-module="cta" style="margin:28px 0 0;padding:18px 20px;border:1px solid ${spec.colors.primary};border-radius:${spec.card.radius};text-align:center;">${renderFreeAiMarkdown(`**${block.text}**`, theme, {
        p: `${paragraphStyle}margin:0;text-align:center;`,
      })}</div>`;
    default:
      return `<div data-format-block="paragraph">${renderFreeAiMarkdown(paragraphMarkdown(block.text), theme)}</div>`;
  }
}

function groupFreeAiSections(blocks: FormattingBlock[]) {
  const sections: FormattingBlock[][] = [];
  let current: FormattingBlock[] = [];

  for (const block of composeFormattingBlocks(blocks)) {
    if (block.type === "heading" && current.length > 0) {
      sections.push(current);
      current = [];
    }
    current.push(block);
  }

  if (current.length > 0) {
    sections.push(current);
  }

  return sections;
}

function renderFreeAiThemeHtml(
  blocks: FormattingBlock[],
  theme: FreeAiThemeId
) {
  const spec = FREE_AI_THEME_SPECS[theme];
  const content = groupFreeAiSections(blocks)
    .map(
      (section) =>
        `<section data-format-section="card" style="margin:0 0 ${spec.layout.cardGap};padding:${spec.layout.cardPadding};background-color:#ffffff;background-image:${spec.card.backgroundImage};background-size:${spec.card.backgroundSize};border:${spec.card.border};border-radius:${spec.card.radius};box-shadow:${spec.card.shadow};">${section.map((block) => renderFreeAiBlock(block, theme)).join("")}</section>`
    )
    .join("");

  return `<section data-wechat-format="${theme}" style="max-width:${spec.layout.maxWidth};margin:0 auto;padding:${spec.layout.pagePadding};background:${spec.colors.page};font-family:${spec.fontFamily};color:${spec.colors.text};font-size:${spec.layout.bodyFontSize};line-height:${spec.layout.lineHeight};letter-spacing:${spec.layout.letterSpacing};">${content}</section>`;
}

export function renderWechatHtml(
  blocks: FormattingBlock[],
  theme: WechatFormatTheme
) {
  if (isFreeAiTheme(theme)) {
    return renderFreeAiThemeHtml(blocks, theme);
  }

  const tokens = WECHAT_THEME_TOKENS[theme];
  const layoutBlocks = prepareLayoutBlocks(blocks);
  let headingIndex = layoutBlocks[0]?.block.type === "heading" ? -1 : 0;
  const content = layoutBlocks
    .map(({ block, partLabel }) => {
      if (block.type === "heading") headingIndex += 1;
      return renderBlock(block, theme, headingIndex, partLabel);
    })
    .join("");
  const padding = theme === "editorial-paper" ? "42px 32px 12px" : "40px 20px 12px";
  const letterSpacing = theme === "editorial-paper" ? "0.1px" : "0.3px";

  return `<section data-wechat-format="${theme}" style="max-width:640px;margin:0 auto;padding:${padding};background:${tokens.pageBackground};font-family:${tokens.textFont};color:${tokens.text};letter-spacing:${letterSpacing};">${content}</section>`;
}
