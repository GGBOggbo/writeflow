import { describe, expect, it } from "vitest";
import { renderWechatHtml } from "./render";
import type { FormattingBlock, WechatFormatTheme } from "@/types/workflow";

const blocks: FormattingBlock[] = [
  { id: "h1", type: "heading", text: "先把主流程跑通" },
  { id: "p1", type: "paragraph", text: "普通正文 <不要执行>。" },
  { id: "pain1", type: "pain", text: "这里是风险提醒。" },
  { id: "quote1", type: "quote", text: "先验证，再优化。" },
  { id: "cta1", type: "cta", text: "你准备先改哪一步？" },
];

describe("renderWechatHtml", () => {
  it.each<WechatFormatTheme>([
    "professional-blue",
    "warm-orange",
    "fresh-teal",
  ])("renders %s with inline WeChat-safe styles", (theme) => {
    const html = renderWechatHtml(blocks, theme);

    expect(html).toContain('style="');
    expect(html).toContain("max-width:640px");
    expect(html).toContain("先把主流程跑通");
    expect(html).toContain("这里是风险提醒");
    expect(html).toContain("你准备先改哪一步");
    expect(html).toContain("&lt;不要执行&gt;");
    expect(html).not.toMatch(/<style[\s>]/i);
    expect(html).not.toMatch(/<script[\s>]/i);
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("display:grid");
    expect(html).not.toContain("position:");
  });

  it("renders all semantic block types without changing their text", () => {
    const html = renderWechatHtml(
      [
        { id: "p", type: "paragraph", text: "普通段落" },
        { id: "h", type: "heading", text: "章节标题" },
        { id: "q", type: "quote", text: "核心金句" },
        { id: "pain", type: "pain", text: "痛点警示" },
        { id: "t", type: "transition", text: "但问题来了" },
        { id: "l", type: "list", text: "第一项\n第二项" },
        { id: "c", type: "comparison", text: "方案 A 对比方案 B" },
        { id: "cta", type: "cta", text: "欢迎留言" },
      ],
      "professional-blue"
    );

    [
      "普通段落",
      "章节标题",
      "核心金句",
      "痛点警示",
      "但问题来了",
      "第一项",
      "第二项",
      "方案 A 对比方案 B",
      "欢迎留言",
    ].forEach((text) => expect(html).toContain(text));
  });

  it("renders quote as a polished card in professional blue", () => {
    const html = renderWechatHtml(
      [{ id: "q", type: "quote", text: "钱刚走，门就关了。" }],
      "professional-blue"
    );

    expect(html).toContain('data-format-block="quote"');
    expect(html).toContain("border-radius:");
    expect(html).toContain("box-shadow:");
    expect(html).not.toContain("background:transparent");
    // quote-mark decoration
    expect(html).toMatch(/["“]/);
  });

  it("renders heading as a polished card for warm orange emphasis", () => {
    const html = renderWechatHtml(
      [
        { id: "h", type: "heading", text: "钱扣了，门也关了" },
        { id: "q", type: "quote", text: "一千四百块，买了六分钟期待。" },
      ],
      "warm-orange"
    );

    expect(html).toContain("font-family:Georgia,'Songti SC'");
    // heading is now a card
    expect(html).toContain('data-format-block="heading"');
    const headingSection = html.match(
      /data-format-block="heading"[^]*?<\/section>/
    )?.[0] ?? "";
    expect(headingSection).toContain("box-shadow:");
    expect(headingSection).toContain("border-radius:");
  });

  it("renders quote and cta as polished cards for fresh teal", () => {
    const html = renderWechatHtml(
      [
        { id: "q", type: "quote", text: "你买的是一张随时会被撕掉的门票。" },
        { id: "cta", type: "cta", text: "你遇到过吗？" },
      ],
      "fresh-teal"
    );

    expect(html).toContain('data-format-block="quote"');
    expect(html).toContain('data-format-block="cta"');
    // quote is a card
    expect(html).toContain("box-shadow:");
    expect(html).toContain("border-radius:");
    // cta uses a gradient background
    expect(html).toContain("linear-gradient");
  });

  it("renders transitions with a gradient line", () => {
    const html = renderWechatHtml(
      [{ id: "t", type: "transition", text: "但问题是" }],
      "professional-blue"
    );

    expect(html).toContain('data-format-block="transition"');
    expect(html).toContain("linear-gradient");
    expect(html).not.toContain("但问题是</p></section><section");
  });

  it("renders pain, lists, and calls to action as polished cards", () => {
    const html = renderWechatHtml(
      [
        { id: "pain", type: "pain", text: "这里真正危险的是沉没成本。" },
        { id: "list", type: "list", text: "先停下来\n再核对事实" },
        { id: "cta", type: "cta", text: "你遇到过类似情况吗？" },
      ],
      "warm-orange"
    );

    expect(html).toContain('data-format-block="pain"');
    expect(html).toContain('data-format-block="list"');
    expect(html).toContain('data-format-block="cta"');
    // pain is a card with warning decoration
    expect(html).toContain("box-shadow:");
    expect(html).toContain("border-radius:");
    expect(html).toContain("⚠");
    // cta uses a gradient
    expect(html).toContain("linear-gradient");
    // list still shows bullets
    expect(html).toContain("&#8226;");
  });

  it("keeps paragraph blocks pure without card styling", () => {
    const html = renderWechatHtml(
      [{ id: "p", type: "paragraph", text: "一段普通正文。" }],
      "professional-blue"
    );

    expect(html).toContain('data-format-block="paragraph"');
    const paragraphSection = html.match(
      /data-format-block="paragraph"[^]*?<\/section>/
    )?.[0] ?? "";
    expect(paragraphSection).not.toContain("box-shadow:");
    expect(paragraphSection).not.toContain("border-radius:");
  });

  it("renders grouped narrative blocks as true natural paragraphs", () => {
    const html = renderWechatHtml(
      [
        { id: "1", type: "paragraph", text: "菜单灰的。" },
        { id: "2", type: "paragraph", text: "点不动。" },
        { id: "3", type: "paragraph", text: "我以为网卡了，刷新。" },
      ],
      "professional-blue"
    );

    expect(html.match(/data-format-block="paragraph"/g)).toHaveLength(1);
    expect(html).toContain("菜单灰的。点不动。我以为网卡了，刷新。");
    expect(html).not.toContain("菜单灰的。<br>");
  });

  it("renders GFM structures instead of exposing Markdown source markers", () => {
    const html = renderWechatHtml(
      [
        { id: "h", type: "heading", text: "## 一个标题" },
        {
          id: "p",
          type: "paragraph",
          text: "这是 **重点**。\n\n- [x] 已完成\n- [ ] 未完成",
        },
        {
          id: "t",
          type: "comparison",
          text: "| 方案 | 结果 |\n| --- | --- |\n| A | 通过 |",
        },
        { id: "c", type: "paragraph", text: "```ts\nconst ok = true;\n```" },
      ],
      "professional-blue"
    );

    expect(html).toContain("<h2");
    expect(html).toContain("<strong");
    expect(html).toContain("<input");
    expect(html).toContain("<table");
    expect(html).toContain("<pre");
    expect(html).not.toContain("## 一个标题");
    expect(html).not.toContain("**重点**");
  });

  it.each<WechatFormatTheme>([
    "professional-blue",
    "warm-orange",
    "fresh-teal",
  ])(
    "inlines font-family with !important on body block paragraphs so WeChat cannot strip it (%s)",
    (theme) => {
      const html = renderWechatHtml(
        [
          { id: "p", type: "paragraph", text: "正文" },
          { id: "pain", type: "pain", text: "痛点" },
          { id: "t", type: "transition", text: "转折" },
          { id: "l", type: "list", text: "一项\n二项" },
          { id: "c", type: "comparison", text: "对比" },
          { id: "cta", type: "cta", text: "行动" },
        ],
        theme
      );

      const paragraphs = html.match(/<p\b[^>]*>/g) ?? [];
      expect(paragraphs.length).toBeGreaterThan(0);
      for (const openingTag of paragraphs) {
        expect(openingTag).toMatch(/font-family:[^;]+!important/);
      }
    }
  );
});
