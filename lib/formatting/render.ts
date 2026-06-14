import type {
  FormattingBlock,
  WechatFormatTheme,
} from "@/types/workflow";
import { renderSafeGfm, type GfmTagStyleMap } from "@/lib/markdown/render";
import { WECHAT_THEME_TOKENS } from "./themes";
import { composeFormattingBlocks } from "./composition";

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

function renderHeading(text: string, theme: WechatFormatTheme) {
  const tokens = WECHAT_THEME_TOKENS[theme];
  const weight = theme === "professional-blue" ? 800 : theme === "fresh-teal" ? 750 : 700;
  const content = renderMarkdown(
    text,
    theme,
    `margin:0;font-family:${tokens.headingFont} !important;font-size:21px;font-weight:${weight};line-height:1.55;color:${tokens.headingText};`,
    {
      h1: `margin:0;font-family:${tokens.headingFont};font-size:23px;font-weight:${weight};line-height:1.5;color:${tokens.headingText};`,
      h2: `margin:0;font-family:${tokens.headingFont};font-size:21px;font-weight:${weight};line-height:1.55;color:${tokens.headingText};`,
      h3: `margin:0;font-family:${tokens.headingFont};font-size:19px;font-weight:${weight};line-height:1.6;color:${tokens.headingText};`,
    }
  );

  return `<section data-format-block="heading" style="margin:40px 0 22px;padding:22px 24px;background:${tokens.headingBackground};box-shadow:${tokens.cardShadow};border-radius:${tokens.cardRadius};border-left:5px solid ${tokens.headingRule};">${content}</section>`;
}

function renderBlock(block: FormattingBlock, theme: WechatFormatTheme) {
  const tokens = WECHAT_THEME_TOKENS[theme];

  switch (block.type) {
    case "heading":
      return renderHeading(block.text, theme);
    case "quote": {
      const quoteMark = (offset: string) =>
        `<span style="font-size:28px;color:${tokens.accent};line-height:0;vertical-align:${offset};">&ldquo;</span>`;
      const inner = renderMarkdown(
        block.text,
        theme,
        `margin:0;font-family:${tokens.headingFont} !important;font-size:18px;font-weight:700;line-height:1.85;color:${tokens.quoteText};`
      );
      return `<section data-format-block="quote" style="margin:32px 0;padding:20px 22px;background:${tokens.quoteBackground};border-left:5px solid ${tokens.quoteBorder};box-shadow:${tokens.cardShadow};border-radius:${tokens.cardRadius};text-align:left;">${quoteMark(
        "-6px"
      )}${inner}${quoteMark("-10px")}</section>`;
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
      return `<section data-format-block="pain" style="margin:28px 0;padding:18px 22px;background:${tokens.painBackground};border-left:5px solid ${tokens.painBorder};box-shadow:${tokens.cardShadow};border-radius:${tokens.cardRadius};">${prefixed}</section>`;
    }
    case "transition":
      return `<section data-format-block="transition" style="margin:38px 0 34px;padding:16px 0 0;text-align:center;"><div style="display:inline-block;width:60%;height:1px;background:linear-gradient(90deg, transparent, ${tokens.accent}, transparent);"></div>${renderMarkdown(block.text, theme, `font-family:${tokens.textFont} !important;margin:10px 0 0;font-size:14px;font-weight:600;letter-spacing:0.1em;color:${tokens.accent};`)}</section>`;
    case "list":
      return `<section data-format-block="list" style="margin:26px 0;padding:20px 22px;background:${tokens.listBackground};box-shadow:${tokens.cardShadow};border-radius:${tokens.cardRadius};">${hasBlockMarkdown(block.text) ? renderMarkdown(block.text, theme, `font-family:${tokens.textFont} !important;margin:0 0 11px;font-size:15px;line-height:1.85;color:${tokens.text};`) : renderLegacyList(block.text, tokens.text, tokens.accent, tokens.textFont)}</section>`;
    case "comparison":
      return `<section data-format-block="comparison" style="margin:30px 0;padding:18px 22px;border-top:3px solid ${tokens.accent};border-bottom:3px solid ${tokens.comparisonBorder};background:${tokens.comparisonBackground};box-shadow:${tokens.cardShadow};border-radius:${tokens.cardRadius};">${renderMarkdown(block.text, theme, `font-family:${tokens.textFont} !important;margin:0;font-size:15px;line-height:1.9;color:${tokens.text};`)}</section>`;
    case "cta":
      return `<section data-format-block="cta" style="margin:44px 0 0;padding:24px 22px;background:linear-gradient(135deg, ${tokens.ctaGradientFrom}, ${tokens.ctaGradientTo});box-shadow:${tokens.cardShadow};border-radius:${tokens.cardRadius};text-align:center;">${renderMarkdown(block.text, theme, `font-family:${tokens.textFont} !important;margin:0;font-size:16px;font-weight:700;line-height:1.8;color:#ffffff;`)}</section>`;
    default:
      return `<section data-format-block="paragraph">${renderMarkdown(paragraphMarkdown(block.text), theme, `font-family:${tokens.textFont} !important;margin:0 0 20px;font-size:16px;line-height:2;color:${tokens.text};`)}</section>`;
  }
}

export function renderWechatHtml(
  blocks: FormattingBlock[],
  theme: WechatFormatTheme
) {
  const tokens = WECHAT_THEME_TOKENS[theme];
  const content = composeFormattingBlocks(blocks)
    .map((block) => renderBlock(block, theme))
    .join("");

  return `<section data-wechat-format="${theme}" style="max-width:640px;margin:0 auto;padding:28px 20px 46px;background:${tokens.pageBackground};font-family:-apple-system,'PingFang SC','Microsoft YaHei','Helvetica Neue',sans-serif;color:${tokens.text};">${content}</section>`;
}
