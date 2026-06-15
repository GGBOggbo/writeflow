import { parseAdvancedMarkdown } from "@/lib/markdown/advanced-modules";
import { renderSafeGfm, type GfmTagStyleMap } from "@/lib/markdown/render";
import { renderAdvancedModule } from "./advanced-module-render";
import { WECHAT_NATIVE_TOKENS as T } from "./wechat-native-tokens";

const markdownStyles: GfmTagStyleMap = {
  h1: `margin:32px 0 18px;color:${T.colors.text};font-family:${T.font};font-size:30px;line-height:1.35;font-weight:900;`,
  h2: `margin:30px 0 16px;padding-left:12px;border-left:4px solid ${T.colors.accent};color:${T.colors.text};font-family:${T.font};font-size:24px;line-height:1.4;font-weight:850;`,
  h3: `margin:26px 0 14px;color:${T.colors.accentStrong};font-family:${T.font};font-size:20px;line-height:1.45;font-weight:800;`,
  h4: `margin:22px 0 12px;color:${T.colors.text};font-family:${T.font};font-size:18px;line-height:1.5;font-weight:800;`,
  h5: `margin:20px 0 10px;color:${T.colors.text};font-family:${T.font};font-size:16px;line-height:1.55;font-weight:800;`,
  h6: `margin:18px 0 10px;color:${T.colors.muted};font-family:${T.font};font-size:14px;line-height:1.55;font-weight:800;`,
  p: `margin:14px 0;color:${T.colors.text};font-family:${T.font};font-size:16px;line-height:1.9;letter-spacing:0.01em;`,
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

export function renderExtendedMarkdown(markdown: string) {
  const footnotes = extractGlobalFootnoteDefinitions(markdown);
  const collectedFootnotes = new Map<string, string>();
  const content = parseAdvancedMarkdown(footnotes.content)
    .map((node) =>
      node.type === "module"
        ? renderAdvancedModule(node)
        : detachFootnotes(
            renderSafeGfm(
              footnotes.definitions
                ? `${node.content}\n\n${footnotes.definitions}`
                : node.content,
              { tagStyles: markdownStyles }
            ),
            collectedFootnotes
          )
    )
    .join("");
  const footnoteHtml = collectedFootnotes.size
    ? `<section class="footnotes" style="margin-top:32px;padding-top:12px;border-top:1px solid ${T.colors.border};font-family:${T.font};color:${T.colors.muted};font-size:13px;"><ol style="margin:0;padding-left:22px;">${[...collectedFootnotes.values()].join("")}</ol></section>`
    : "";

  return `<article data-wechat-theme="wechat-native" style="width:100%;max-width:680px;margin:0 auto;padding:12px 16px 36px;box-sizing:border-box;background:${T.colors.surface};color:${T.colors.text};font-family:${T.font};word-break:break-word;overflow-wrap:anywhere;">${content}${footnoteHtml}</article>`;
}
