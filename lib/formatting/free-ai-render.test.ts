import { describe, expect, it } from "vitest";
import type { FormattingBlock } from "@/types/workflow";
import {
  FREE_AI_THEME_IDS,
  FREE_AI_THEME_SPECS,
} from "./free-ai-themes";
import { renderWechatHtml } from "./render";

const blocks: FormattingBlock[] = [
  { id: "h1", type: "heading", text: "真正的问题不在工具" },
  { id: "p1", type: "paragraph", text: "先把内容讲清楚，再谈排版。" },
  { id: "q1", type: "quote", text: "结构稳定，风格才有意义。" },
  { id: "h2", type: "heading", text: "第二个判断" },
  { id: "p2", type: "paragraph", text: "这是下一节正文。" },
  { id: "t1", type: "transition", text: "---" },
];

describe("renderWechatHtml free AI themes", () => {
  it.each(FREE_AI_THEME_IDS)(
    "renders the shared card skeleton for %s",
    (theme) => {
      const html = renderWechatHtml(blocks, theme);
      const spec = FREE_AI_THEME_SPECS[theme];

      expect(html).toContain(`data-wechat-format="${theme}"`);
      expect(html).toContain("max-width:800px");
      expect(html).toContain("padding:40px 10px");
      expect(html).toContain(`background:${spec.colors.page}`);
      expect(html).toContain('data-format-section="card"');
      expect(html).toContain("padding:25px");
      expect(html).toContain("margin:0 0 40px");
      expect(html).toContain(`background-image:${spec.card.backgroundImage}`);
      expect(html).toContain(`background-size:${spec.card.backgroundSize}`);
      expect(html).toContain(`border-radius:${spec.card.radius}`);
      expect(html).toContain(`box-shadow:${spec.card.shadow}`);
    }
  );

  it.each(FREE_AI_THEME_IDS)(
    "renders prompt-defined heading, paragraph, quote and divider rules for %s",
    (theme) => {
      const html = renderWechatHtml(blocks, theme);
      const spec = FREE_AI_THEME_SPECS[theme];

      expect(html).toContain(`>${spec.heading.symbol}</span>`);
      expect(html).toContain(`border-bottom:${spec.heading.h2Border}`);
      expect(html).toContain(`color:${spec.colors.text}`);
      expect(html).toContain(`background:${spec.colors.quote}`);
      expect(html).toContain(`border-left:5px solid ${spec.colors.primary}`);
      expect(html).toContain(spec.divider.background);

      const paragraphs = html.match(/<p\b[^>]*>/g) ?? [];
      expect(paragraphs.length).toBeGreaterThan(0);
      for (const paragraph of paragraphs) {
        expect(paragraph).toContain(`color:${spec.colors.text}`);
      }
    }
  );

  it("keeps the same content skeleton across all selectable themes", () => {
    const skeleton = (theme: (typeof FREE_AI_THEME_IDS)[number]) =>
      renderWechatHtml(blocks, theme)
        .replace(/style="[^"]*"/g, 'style=""')
        .replace(/data-wechat-format="[^"]+"/g, 'data-wechat-format=""')
        .replace(/[❀▶◆—]/g, "");

    expect(skeleton("spring-fresh")).toBe(skeleton("autumn-warm"));
    expect(skeleton("spring-fresh")).toBe(skeleton("ocean-calm"));
    expect(skeleton("spring-fresh")).toBe(skeleton("claude-warm-paper"));
  });

  it("renders the Claude-inspired theme with warm editorial typography", () => {
    const html = renderWechatHtml(blocks, "claude-warm-paper");

    expect(html).toContain('data-wechat-format="claude-warm-paper"');
    expect(html).toContain("background:#f5f4ed");
    expect(html).toContain("color:#141413");
    expect(html).toContain("font-family:Georgia,'Times New Roman',serif");
    expect(html).toContain("color:#c96442");
    expect(html).not.toContain("radial-gradient");
  });

  it("does not nest blockquotes when a semantic quote already contains Markdown markers", () => {
    const html = renderWechatHtml(
      [
        {
          id: "quote-1",
          type: "quote",
          text: "> 结构稳定，风格才有意义。",
        },
      ],
      "spring-fresh"
    );

    expect(html.match(/<blockquote\b/g)).toHaveLength(1);
    expect(html).toContain("结构稳定，风格才有意义。");
    expect(html).not.toContain("&gt;");
  });
});
