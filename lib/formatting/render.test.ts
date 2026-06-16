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

const springTheme: WechatFormatTheme = "spring-fresh";
const autumnTheme: WechatFormatTheme = "autumn-warm";
const oceanTheme: WechatFormatTheme = "ocean-calm";
const editorialTheme: WechatFormatTheme = "editorial-paper";

describe("renderWechatHtml", () => {
  it("never injects editorial labels that are absent from the article", () => {
    const html = renderWechatHtml(
      [
        { id: "h1", type: "heading", text: "真正的问题不在模型" },
        { id: "q", type: "quote", text: "规则越复杂，读者越容易离开。" },
        { id: "h2", type: "heading", text: "先看事实" },
        { id: "pain", type: "pain", text: "别让排版抢走正文的焦点。" },
        { id: "t", type: "transition", text: "但事情还没结束。" },
        { id: "list", type: "list", text: "保留正文\n克制强调" },
        { id: "c", type: "comparison", text: "旧版与新版" },
        { id: "cta", type: "cta", text: "你更愿意读哪一种？" },
      ],
      springTheme
    );

    [
      "深度阅读",
      "继续阅读，先看清这篇文章的核心判断",
      "核心判断",
      "章节",
      "注意",
      "下一段为什么重要",
      "要点清单",
      "对比判断",
      "下一步",
    ].forEach((label) => expect(html).not.toContain(label));
  });

  it.each<WechatFormatTheme>([springTheme, autumnTheme, oceanTheme])(
    "renders the distilled free AI card skeleton for %s",
    (theme) => {
      const html = renderWechatHtml(
        [
          { id: "h1", type: "heading", text: "文章主张" },
          { id: "p1", type: "paragraph", text: "开场正文。" },
          { id: "q1", type: "quote", text: "结构先于风格。" },
          { id: "h2", type: "heading", text: "问题在哪里" },
          { id: "pain", type: "pain", text: "不要把所有内容套成同款卡片。" },
          { id: "t", type: "transition", text: "接下来看看怎么解决。" },
          { id: "list", type: "list", text: "先识别结构\n再渲染模块" },
          { id: "comparison", type: "comparison", text: "旧骨架 vs 新骨架" },
          { id: "cta", type: "cta", text: "现在开始使用这套骨架。" },
        ],
        theme
      );

      expect(html.match(/data-format-section="card"/g)).toHaveLength(2);
      expect(html.match(/data-layout-module="part"/g)).toHaveLength(2);
      expect(html).toContain('data-layout-module="quote-card"');
      expect(html).toContain('data-layout-module="callout"');
      expect(html).toContain('data-layout-module="bridge"');
      expect(html).toContain('data-layout-module="list-panel"');
      expect(html).toContain('data-layout-module="comparison-panel"');
      expect(html).toContain('data-layout-module="cta"');
      expect(html).not.toContain('data-layout-module="hero"');
    }
  );

  it("keeps the same module order across the three free themes", () => {
    const skeletonBlocks: FormattingBlock[] = [
      { id: "h1", type: "heading", text: "文章主张" },
      { id: "q", type: "quote", text: "一句判断。" },
      { id: "h2", type: "heading", text: "第二部分" },
      { id: "pain", type: "pain", text: "一个提醒。" },
      { id: "cta", type: "cta", text: "采取行动。" },
    ];
    const modules = (theme: WechatFormatTheme) =>
      [...renderWechatHtml(skeletonBlocks, theme).matchAll(/data-layout-module="([^"]+)"/g)]
        .map((match) => match[1]);

    expect(modules(springTheme)).toEqual(modules(autumnTheme));
    expect(modules(springTheme)).toEqual(modules(oceanTheme));
    expect(modules(springTheme)).toEqual([
      "part",
      "quote-card",
      "part",
      "callout",
      "cta",
    ]);
  });

  it("merges a numeric heading and its following title into one part", () => {
    const html = renderWechatHtml(
      [
        { id: "hero", type: "heading", text: "文章主张" },
        { id: "number", type: "heading", text: "01" },
        { id: "title", type: "heading", text: "问题真正出在哪里" },
        { id: "p", type: "paragraph", text: "章节正文。" },
      ],
      editorialTheme
    );

    expect(html.match(/data-layout-module="part"/g)).toHaveLength(1);
    expect(html).toContain("问题真正出在哪里");
    expect(html).toContain(">01</span>");
  });

  it("keeps a Chinese chapter number readable when merging headings", () => {
    const html = renderWechatHtml(
      [
        { id: "hero", type: "heading", text: "文章主张" },
        { id: "number", type: "heading", text: "一" },
        { id: "title", type: "heading", text: "先看问题" },
      ],
      editorialTheme
    );

    expect(html).toContain(">一</span>");
    expect(html).not.toContain(">0一</span>");
  });

  it("does not repeat a chapter number already present in the heading text", () => {
    const html = renderWechatHtml(
      [
        { id: "hero", type: "heading", text: "文章主张" },
        { id: "part", type: "heading", text: "02 真正重要的问题" },
      ],
      editorialTheme
    );

    expect(html).toContain(">02</span>");
    expect(html).toContain("真正重要的问题");
    expect(html).not.toContain(">02 真正重要的问题<");
  });

  it.each<WechatFormatTheme>([
    springTheme,
  ])("renders %s with inline WeChat-safe styles", (theme) => {
    const html = renderWechatHtml(blocks, theme);

    expect(html).toContain('style="');
    expect(html).toContain("max-width:800px");
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

  it("uses part modules when narrative paragraphs appear before the first heading", () => {
    const html = renderWechatHtml(
      [
        { id: "intro", type: "paragraph", text: "开场正文。" },
        { id: "h1", type: "heading", text: "第一章" },
        { id: "p1", type: "paragraph", text: "第一章正文。" },
        { id: "h2", type: "heading", text: "第二章" },
        { id: "p2", type: "paragraph", text: "第二章正文。" },
      ],
      springTheme
    );

    expect(html.match(/data-format-section="card"/g)).toHaveLength(3);
    expect(html).not.toContain('data-layout-module="hero"');
    expect(html.match(/data-layout-module="part"/g)).toHaveLength(2);
    expect(html).not.toContain("深度阅读");
    expect(html).not.toContain(">01</span>");
    expect(html).not.toContain(">02</span>");
  });

  it("renders editorial-paper as a continuous restrained article", () => {
    const html = renderWechatHtml(
      [
        { id: "intro", type: "paragraph", text: "开场正文。" },
        { id: "h1", type: "heading", text: "第一章" },
        { id: "q1", type: "quote", text: "先留下判断。" },
        { id: "pain1", type: "pain", text: "不要每次从零开始。" },
        { id: "h2", type: "heading", text: "第二章" },
        { id: "cta1", type: "cta", text: "把判断变成资产。" },
      ],
      editorialTheme
    );

    expect(html).toContain('data-wechat-format="editorial-paper"');
    expect(html).toContain("#f5f4ed");
    expect(html).not.toContain("data-format-section=");
    expect(html).not.toContain('data-layout-module="hero"');
    expect(html.match(/data-layout-module="part"/g)).toHaveLength(2);
    expect(html).toContain("border-top:1px solid");
    expect(html).not.toContain("radial-gradient");
    expect(html).not.toContain("❀");

    const ctaSection =
      html.match(/data-format-block="cta"[^]*?<\/section>/)?.[0] ?? "";
    expect(ctaSection).not.toContain("linear-gradient");
    expect(ctaSection).toContain("border-top:1px solid");
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
      springTheme
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

  it("renders quote as an inset spring-fresh card", () => {
    const html = renderWechatHtml(
      [{ id: "q", type: "quote", text: "钱刚走，门就关了。" }],
      springTheme
    );

    expect(html).toContain('data-format-block="quote"');
    expect(html).toContain("border-radius:");
    expect(html).toContain('data-layout-module="quote-card"');
    expect(html).not.toContain("background:transparent");
    // restraint: no decorative quote-mark wrapping on quote cards
    expect(html).not.toContain("&ldquo;");
  });

  it("removes duplicated outer quote marks from quote-card presentation only", () => {
    const html = renderWechatHtml(
      [
        { id: "q1", type: "quote", text: "“你不用做什么，我也认你。”" },
        { id: "q2", type: "quote", text: '"先停下来，再做判断。"' },
      ],
      springTheme
    );

    expect(html).toContain("你不用做什么，我也认你。");
    expect(html).toContain("先停下来，再做判断。");
    expect(html).not.toContain("“你不用做什么");
    expect(html).not.toContain('"先停下来');
  });

  it("renders cta as a restrained bordered action block", () => {
    const html = renderWechatHtml(
      [{ id: "cta", type: "cta", text: "你准备先改哪一步？" }],
      springTheme
    );

    expect(html).toContain('data-format-block="cta"');
    const ctaSection =
      html.match(/data-format-block="cta"[^]*?<\/section>/)?.[0] ?? "";
    expect(ctaSection).toContain("border:1px solid #6b9b7a");
    expect(ctaSection).toContain("color:#3d4a3d");
    expect(ctaSection).not.toContain("linear-gradient");
  });

  it("renders the first heading inside the shared free-theme card skeleton", () => {
    const html = renderWechatHtml(
      [
        { id: "h", type: "heading", text: "钱扣了，门也关了" },
        { id: "q", type: "quote", text: "一千四百块，买了六分钟期待。" },
      ],
      springTheme
    );

    expect(html).toContain('data-format-block="heading"');
    const headingSection = html.match(
      /data-format-block="heading"[^]*?<\/section>/
    )?.[0] ?? "";
    expect(headingSection).toContain('data-layout-module="part"');
    expect(headingSection).toContain("钱扣了，门也关了");
    expect(headingSection).not.toContain("深度阅读");
    expect(html).toContain('data-format-section="card"');
  });

  it("renders quote and cta with spring-fresh emphasis", () => {
    const html = renderWechatHtml(
      [
        { id: "q", type: "quote", text: "你买的是一张随时会被撕掉的门票。" },
        { id: "cta", type: "cta", text: "你遇到过吗？" },
      ],
      springTheme
    );

    expect(html).toContain('data-format-block="quote"');
    expect(html).toContain('data-format-block="cta"');
    // quote uses the shared quote-card skeleton
    expect(html).toContain('data-layout-module="quote-card"');
    expect(html).toContain("border-radius:");
    // CTA stays inside the same prompt-defined card system.
    expect(html).toContain("border:1px solid #6b9b7a");
  });

  it("renders transitions as bridge modules", () => {
    const html = renderWechatHtml(
      [{ id: "t", type: "transition", text: "但问题是" }],
      springTheme
    );

    expect(html).toContain('data-format-block="transition"');
    expect(html).toContain('data-layout-module="bridge"');
    expect(html).not.toContain("下一段为什么重要");
    const transitionSection =
      html.match(/data-format-block="transition"[^]*?<\/section>/)?.[0] ?? "";
    expect(transitionSection).toContain("background:linear-gradient");
    expect(transitionSection).not.toContain("border-left:");
    expect(html).not.toContain("但问题是</p></section><section");
  });

  it("renders pain, lists, and calls to action with distinct module skeletons", () => {
    const html = renderWechatHtml(
      [
        { id: "pain", type: "pain", text: "这里真正危险的是沉没成本。" },
        { id: "list", type: "list", text: "先停下来\n再核对事实" },
        { id: "cta", type: "cta", text: "你遇到过类似情况吗？" },
      ],
      springTheme
    );

    expect(html).toContain('data-format-block="pain"');
    expect(html).toContain('data-format-block="list"');
    expect(html).toContain('data-format-block="cta"');
    expect(html).toContain('data-layout-module="callout"');
    expect(html).toContain('data-layout-module="list-panel"');
    expect(html).toContain('data-layout-module="cta"');
    expect(html).toContain("border-radius:");
    expect(html).not.toContain("⚠");
    expect(html).not.toContain("ctaGradient");
    // list uses native semantic list markup.
    expect(html).toContain("<li");
  });

  it("keeps paragraph blocks pure without card styling", () => {
    const html = renderWechatHtml(
      [{ id: "p", type: "paragraph", text: "一段普通正文。" }],
      springTheme
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
      springTheme
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
      springTheme
    );

    expect(html).toContain("<h2");
    expect(html).toContain("<strong");
    expect(html).toContain("<input");
    expect(html).toContain("<table");
    expect(html).toContain("<pre");
    expect(html).not.toContain("## 一个标题");
    expect(html).not.toContain("**重点**");
  });

  it.each<WechatFormatTheme>([springTheme])(
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
