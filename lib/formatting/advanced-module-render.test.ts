import { describe, expect, it } from "vitest";
import {
  parseAdvancedMarkdown,
  type AdvancedModuleNode,
} from "@/lib/markdown/advanced-modules";
import { LEGACY_ADVANCED_MODULE_NAMES } from "@/lib/markdown/module-defs";
import { renderAdvancedModule } from "./advanced-module-render";

const MODULE_SAMPLES: Record<
  (typeof LEGACY_ADVANCED_MODULE_NAMES)[number],
  { markdown: string; expected: string }
> = {
  hero: {
    markdown: `:::hero
eyebrow: FEATURE
title: 结构负责说服力 | 主题负责气质
subtitle: 一套稳定的表达系统
image: https://example.com/hero.png
brand: md2wechat
tags: 结构化 | 可复用
:::`,
    expected: "结构负责说服力",
  },
  cards: {
    markdown: `:::cards[高级排版模块]
PART 01 | 开场模块 | 先交代判断 | accent
:::`,
    expected: "开场模块",
  },
  metrics: {
    markdown: `:::metrics[关键结果]
结构复用 | 31 模块 | 全部本地渲染 | accent
:::`,
    expected: "31 模块",
  },
  infographic: {
    markdown: `:::infographic
eyebrow: 文章信息图
title: 让|一句判断|先被看到
subtitle: 一张卡只讲一个判断
quote: 结构先行
:::`,
    expected: "一句判断",
  },
  "audience-fit": {
    markdown: `:::audience-fit
title: 这篇适合谁
fit: 内容团队 | 自媒体
avoid: 只发短讯的人
:::`,
    expected: "内容团队",
  },
  verdict: {
    markdown: `:::verdict
eyebrow: 最终判断
title: 品牌表达系统更重要
body: 模块必须解决新的阅读任务。
:::`,
    expected: "品牌表达系统更重要",
  },
  people: {
    markdown: `:::people[核心角色]
内容负责人 | 内容策略 | 负责把文章重点定下来 | accent
:::`,
    expected: "内容负责人",
  },
  cases: {
    markdown: `:::cases[案例精选]
品牌发布稿 | 阅读完成率 +38% | 更容易把重点讲清楚 | accent
:::`,
    expected: "阅读完成率 +38%",
  },
  pricing: {
    markdown: `:::pricing[方案组合]
专业版 | ￥599 | 高级模块 / 商业稿结构 | accent
:::`,
    expected: "￥599",
  },
  faq: {
    markdown: `:::faq[常见问题]
这些模块只能在新主题里用吗？ | 不是，所有主题都会生效。
:::`,
    expected: "所有主题都会生效",
  },
  logos: {
    markdown: `:::logos[合作品牌]
Northstar | 增长团队
:::`,
    expected: "Northstar",
  },
  part: {
    markdown: `:::part
index: 01
title: 正文能力接进同一套系统
subtitle: TYPOGRAPHY · STRUCTURE
:::`,
    expected: "正文能力接进同一套系统",
  },
  "label-title": {
    markdown: `:::label-title
label: 模块
title: 把内容拆成更好读的结构
:::`,
    expected: "把内容拆成更好读的结构",
  },
  quote: {
    markdown: `:::quote
eyebrow: 核心观点
quote: 模块不是为了让页面更满。
source: 内容设计原则
:::`,
    expected: "内容设计原则",
  },
  "image-text": {
    markdown: `:::image-text
title: 图和说明绑在一起
body: 减少来回切换成本。
image: https://example.com/image-text.png
alt: 图文示例
:::`,
    expected: "图和说明绑在一起",
  },
  "image-compare": {
    markdown: `:::image-compare
title: 前后对比
left_title: 改版前
left_image: https://example.com/before.png
right_title: 改版后
right_image: https://example.com/after.png
:::`,
    expected: "改版后",
  },
  "image-annotate": {
    markdown: `:::image-annotate
title: 图片标注卡
image: https://example.com/annotate.png
point: 01 | 24 | 24 | 主信息区 | 先看核心判断
:::`,
    expected: "主信息区",
  },
  toc: {
    markdown: `:::toc[阅读导航]
01 | 先看结构 | 先告诉读者怎么读
:::`,
    expected: "先看结构",
  },
  checklist: {
    markdown: `:::checklist[发布前检查]
done | 结构先搭好 | 先把目录摆出来
:::`,
    expected: "结构先搭好",
  },
  toolbox: {
    markdown: `:::toolbox[资源工具箱]
工具 | Markdown 转换 API | 接进自动化工作流 | https://example.com/tool
:::`,
    expected: "Markdown 转换 API",
  },
  specs: {
    markdown: `:::specs[参数信息]
适用对象 | 内容团队 / 自媒体 | 更适合长文
:::`,
    expected: "适用对象",
  },
  "image-steps": {
    markdown: `:::image-steps[操作步骤]
01 | 打开编辑器 | 先确定文章结构。 | https://example.com/step.png | 操作截图
:::`,
    expected: "打开编辑器",
  },
  notice: {
    markdown: `:::notice[适用说明]
风险 | 模块堆太多会抢正文 | 一篇保留 3 到 6 个重点模块
:::`,
    expected: "3 到 6 个",
  },
  gallery: {
    markdown: `:::gallery[滑动浏览]
![山景图片](https://example.com/mountain.png)
![海景图片](https://example.com/sea.png)
:::`,
    expected: "山景图片",
  },
  longimage: {
    markdown: `:::longimage[产品架构设计图]
![系统架构流程图](https://example.com/long.png)
:::`,
    expected: "系统架构流程图",
  },
  dialogue: {
    markdown: `:::dialogue[产品讨论]
用户: 为什么要模块化？
AI: 为了让结构稳定。
:::`,
    expected: "为什么要模块化",
  },
  summary: {
    markdown: `:::summary
eyebrow: 一句话总结
highlight: 先把结构搭稳
body: 主题再接管气质。
:::`,
    expected: "先把结构搭稳",
  },
  "author-card": {
    markdown: `:::author-card
name: 极客旅程
role: 独立开发者 / 内容产品
bio: 关注内容系统。
link: https://example.com/author
:::`,
    expected: "极客旅程",
  },
  series: {
    markdown: `:::series
name: 内容产品手记
issue: 07
title: 让每篇文章像同一个品牌写出来
next: 下一篇：个人品牌模块怎么搭
:::`,
    expected: "内容产品手记",
  },
  subscribe: {
    markdown: `:::subscribe
label: 持续更新
title: 把这个系列收藏起来
primary: 关注公众号
secondary: 转发给朋友
:::`,
    expected: "关注公众号",
  },
  cta: {
    markdown: `:::cta
title: 从这套高级模块开始
note: BUILD WITH STRUCTURE
:::`,
    expected: "从这套高级模块开始",
  },
};

function parseModule(markdown: string): AdvancedModuleNode {
  const [node] = parseAdvancedMarkdown(markdown);
  if (!node || node.type !== "module") {
    throw new Error("Expected one advanced module node");
  }
  return node;
}

describe("renderAdvancedModule", () => {
  it.each(LEGACY_ADVANCED_MODULE_NAMES)(
    "renders the legacy %s module with its own action id and visible content",
    (name) => {
      const sample = MODULE_SAMPLES[name];
      const html = renderAdvancedModule(parseModule(sample.markdown));

      expect(html).toContain(`data-mpa-action-id="${name}"`);
      expect(html).toContain(sample.expected);
      expect(html).toContain("style=");
      expect(html).not.toContain(":::");
    }
  );

  it("renders wf modules with Writeflow-owned attributes and no copied mpa ids", () => {
    const html = renderAdvancedModule(
      parseModule(`:::wf-pullquote
quote: 先验证用户路径，再考虑模型配置。
source: 原文
:::`)
    );

    expect(html).toContain('data-writeflow-module="wf-pullquote"');
    expect(html).toContain("先验证用户路径");
    expect(html).not.toContain("data-mpa-action-id");
    expect(html).not.toContain("grid-template-columns");
    expect(html).not.toContain("linear-gradient");
  });

  it("renders wf-points and wf-steps as readable stacked mobile blocks", () => {
    const points = renderAdvancedModule(
      parseModule(`:::wf-points
01 | 先确认主流程 | 不急着堆功能。
02 | 再确认复制效果 | 公众号后台不塌才算完成。
:::`)
    );

    expect(points).toContain('data-writeflow-module="wf-points"');
    expect(points).toContain("先确认主流程");
    expect(points).toContain("公众号后台不塌");
    expect(points).not.toContain("display:grid");
  });

  // ===== 批次1:8 个新模块渲染测试 =====
  it("renders wf-toc as a numbered directory list", () => {
    const html = renderAdvancedModule(
      parseModule(`:::wf-toc
01 | 先确认主流程 | main
02 | 再验证复制效果 | copy
:::`)
    );
    expect(html).toContain('data-writeflow-module="wf-toc"');
    expect(html).toContain("先确认主流程");
    expect(html).not.toContain("data-mpa-action-id");
  });

  it("renders wf-quote with left block and pale background", () => {
    const html = renderAdvancedModule(
      parseModule(`:::wf-quote
body: 排版的核心是让读者的眼睛有地方休息。
source: 原文
:::`)
    );
    expect(html).toContain('data-writeflow-module="wf-quote"');
    expect(html).toContain("排版的核心");
    expect(html).toContain("border-left:4px solid");
    expect(html).not.toContain("data-mpa-action-id");
  });

  it("renders wf-highlight as a centered banner with top bar", () => {
    const html = renderAdvancedModule(
      parseModule(`:::wf-highlight
body: 预览好看不算完成，粘贴不塌才算完成。
:::`)
    );
    expect(html).toContain('data-writeflow-module="wf-highlight"');
    expect(html).toContain("text-align:center");
    expect(html).toContain("border-top:3px solid");
    expect(html).not.toContain("data-mpa-action-id");
  });

  it("renders wf-faq with Q anchor and indented answer", () => {
    const html = renderAdvancedModule(
      parseModule(`:::wf-faq
question: 排版会改写我的内容吗？
answer: 不会，只改呈现节奏，不改内容。
:::`)
    );
    expect(html).toContain('data-writeflow-module="wf-faq"');
    expect(html).toContain("排版会改写");
    expect(html).not.toContain("data-mpa-action-id");
  });

  it("renders wf-metric with large centered number", () => {
    const html = renderAdvancedModule(
      parseModule(`:::wf-metric
value: 12
label: 核心模块数
:::`)
    );
    expect(html).toContain('data-writeflow-module="wf-metric"');
    expect(html).toContain("font-size:36px");
    expect(html).toContain("text-align:center");
    expect(html).not.toContain("data-mpa-action-id");
  });

  it("renders wf-timeline as a vertical axis with dot anchors", () => {
    const html = renderAdvancedModule(
      parseModule(`:::wf-timeline
06-01 | 项目启动 | 第一版原型。
06-17 | 排版完成 | 33 个模块就位。
:::`)
    );
    expect(html).toContain('data-writeflow-module="wf-timeline"');
    expect(html).toContain("项目启动");
    expect(html).toContain("border-radius:999px");
    expect(html).not.toContain("data-mpa-action-id");
  });

  it("renders wf-callout with top color bar and pale box", () => {
    const html = renderAdvancedModule(
      parseModule(`:::wf-callout
title: 阶段小结
body: 先跑通主流程，再谈优化。
:::`)
    );
    expect(html).toContain('data-writeflow-module="wf-callout"');
    expect(html).toContain("border-top:3px solid");
    expect(html).toContain("阶段小结");
    expect(html).not.toContain("data-mpa-action-id");
  });

  it("renders wf-signoff centered with divider and signature", () => {
    const html = renderAdvancedModule(
      parseModule(`:::wf-signoff
body: 愿你下次开发更顺。
signature: —— Writeflow
:::`)
    );
    expect(html).toContain('data-writeflow-module="wf-signoff"');
    expect(html).toContain("text-align:center");
    expect(html).toContain("Writeflow");
    expect(html).not.toContain("data-mpa-action-id");
  });

  it("uses the shared wechat-native visual contract", () => {
    const html = renderAdvancedModule(parseModule(MODULE_SAMPLES.hero.markdown));

    expect(html).toContain("font-family:");
    expect(html).toContain("border-radius:");
    expect(html).toContain("#b3593b");
    expect(html).not.toContain("#1f5f46");
  });

  it("renders CTA with the archived warm-paper action skeleton", () => {
    const html = renderAdvancedModule(
      parseModule(MODULE_SAMPLES.cta.markdown)
    );

    expect(html).toContain("保存灵感");
    expect(html).toContain("直接套用");
    expect(html).toContain("继续体验");
    expect(html).toContain(
      "grid-template-columns:repeat(2,minmax(0,1fr))"
    );
    expect(html).toContain("#ead6cc");
    expect(html).toContain("#b2583b");
    expect(html).not.toContain("#1f5f46");
  });

  it("renders verdict as a compact warm-paper judgment card", () => {
    const html = renderAdvancedModule(
      parseModule(MODULE_SAMPLES.verdict.markdown)
    );

    expect(html).toContain("最终判断");
    expect(html).toContain("width:11px");
    expect(html).toContain(
      "linear-gradient(135deg,#ead6cc 0%,#faf9f5 48%,#f7f7f7 100%)"
    );
    expect(html).toContain("font-size:17px");
    expect(html).toContain("font-size:15px");
    expect(html).not.toContain("border:2px solid");
  });

  it("uses distinct reference skeletons for entry and section modules", () => {
    const hero = renderAdvancedModule(
      parseModule(MODULE_SAMPLES.hero.markdown)
    );
    const part = renderAdvancedModule(
      parseModule(MODULE_SAMPLES.part.markdown)
    );
    const labelTitle = renderAdvancedModule(
      parseModule(MODULE_SAMPLES["label-title"].markdown)
    );

    expect(hero).toContain("width:100%");
    expect(hero).toContain(
      "linear-gradient(180deg,#ead6cc 0%,#faf9f5 46%,#faf9f5 100%)"
    );
    expect(part).toContain("width:56px");
    expect(part).toContain("border-radius:999px");
    expect(labelTitle).toContain("<h4");
  });

  it("uses responsive grid skeletons for evidence modules", () => {
    const cards = renderAdvancedModule(
      parseModule(MODULE_SAMPLES.cards.markdown)
    );
    const metrics = renderAdvancedModule(
      parseModule(MODULE_SAMPLES.metrics.markdown)
    );
    const people = renderAdvancedModule(
      parseModule(MODULE_SAMPLES.people.markdown)
    );

    expect(cards).toContain(
      "grid-template-columns:repeat(auto-fit,minmax(160px,1fr))"
    );
    expect(metrics).toContain(
      "grid-template-columns:repeat(auto-fit,minmax(160px,1fr))"
    );
    expect(people).toContain(
      "grid-template-columns:repeat(auto-fit,minmax(180px,1fr))"
    );
  });

  it("uses compact judgment and summary reference skeletons", () => {
    const quote = renderAdvancedModule(
      parseModule(MODULE_SAMPLES.quote.markdown)
    );
    const summary = renderAdvancedModule(
      parseModule(MODULE_SAMPLES.summary.markdown)
    );
    const faq = renderAdvancedModule(
      parseModule(MODULE_SAMPLES.faq.markdown)
    );

    expect(quote).toContain("font-size:22px");
    expect(summary).toContain("border-left:3px solid #b3593b");
    expect(faq).toContain(">Q<");
    expect(faq).toContain(">A<");
  });

  it("uses reference image composition skeletons", () => {
    const imageText = renderAdvancedModule(
      parseModule(MODULE_SAMPLES["image-text"].markdown)
    );
    const imageCompare = renderAdvancedModule(
      parseModule(MODULE_SAMPLES["image-compare"].markdown)
    );
    const imageAnnotate = renderAdvancedModule(
      parseModule(MODULE_SAMPLES["image-annotate"].markdown)
    );

    expect(imageText).toContain("display:flex;flex-wrap:wrap");
    expect(imageCompare).toContain(
      "grid-template-columns:repeat(auto-fit,minmax(280px,1fr))"
    );
    expect(imageAnnotate).toContain("aspect-ratio:4/3");
  });

  it("uses reference utility and ending skeletons", () => {
    const series = renderAdvancedModule(
      parseModule(MODULE_SAMPLES.series.markdown)
    );
    const subscribe = renderAdvancedModule(
      parseModule(MODULE_SAMPLES.subscribe.markdown)
    );
    const toc = renderAdvancedModule(
      parseModule(MODULE_SAMPLES.toc.markdown)
    );

    expect(series).toContain(
      "linear-gradient(180deg,#ead6cc 0%,#f7f7f7 100%)"
    );
    expect(subscribe).toContain(
      "grid-template-columns:repeat(2,minmax(0,1fr))"
    );
    expect(toc).toContain("flex-direction:column");
  });

  it("uses the archived utility module skeletons instead of generic shells", () => {
    const infographic = renderAdvancedModule(
      parseModule(MODULE_SAMPLES.infographic.markdown)
    );
    const checklist = renderAdvancedModule(
      parseModule(MODULE_SAMPLES.checklist.markdown)
    );
    const toolbox = renderAdvancedModule(
      parseModule(MODULE_SAMPLES.toolbox.markdown)
    );
    const specs = renderAdvancedModule(
      parseModule(MODULE_SAMPLES.specs.markdown)
    );
    const imageSteps = renderAdvancedModule(
      parseModule(MODULE_SAMPLES["image-steps"].markdown)
    );
    const notice = renderAdvancedModule(
      parseModule(MODULE_SAMPLES.notice.markdown)
    );

    expect(infographic).toContain("data-infographic-type=");
    expect(infographic).toContain("min-height:238px");
    expect(checklist).toContain("text-decoration:line-through");
    expect(checklist).toContain("flex-direction:column;gap:12px");
    expect(toolbox).toContain("linear-gradient(180deg,#faf9f5 0%,#f7f7f7 100%)");
    expect(toolbox).toContain("打开资源 →");
    expect(specs).toContain("grid-template-columns:1fr auto");
    expect(imageSteps).toContain("min-height:200px");
    expect(imageSteps).toContain("flex-direction:column;align-items:stretch");
    expect(notice).toContain("grid-template-columns:96px 1fr");
  });

  it("uses the archived media, dialogue, and author skeletons", () => {
    const gallery = renderAdvancedModule(
      parseModule(MODULE_SAMPLES.gallery.markdown)
    );
    const longimage = renderAdvancedModule(
      parseModule(MODULE_SAMPLES.longimage.markdown)
    );
    const dialogue = renderAdvancedModule(
      parseModule(MODULE_SAMPLES.dialogue.markdown)
    );
    const author = renderAdvancedModule(
      parseModule(MODULE_SAMPLES["author-card"].markdown)
    );

    expect(gallery).toContain("scroll-snap-type:x mandatory");
    expect(gallery).toContain("flex:0 0 78%");
    expect(gallery).toContain("aspect-ratio:4/3");
    expect(longimage).toContain("max-height:min(75vh,600px)");
    expect(longimage).toContain("linear-gradient(135deg,#ead6cc,#faf9f5)");
    expect(dialogue).toContain("flex-direction:row-reverse");
    expect(dialogue).toContain("width:32px;height:32px");
    expect(author).toContain("width:46px;height:46px");
    expect(author).toContain(
      "linear-gradient(135deg,#ead6cc 0%,#faf9f5 42%,#f7f7f7 100%)"
    );
  });

  it("keeps safe images and links while rejecting executable URLs", () => {
    const safeImage = renderAdvancedModule(
      parseModule(MODULE_SAMPLES["image-text"].markdown)
    );
    const safeLink = renderAdvancedModule(
      parseModule(MODULE_SAMPLES.toolbox.markdown)
    );
    const unsafe = renderAdvancedModule(
      parseModule(`:::toolbox[工具]
类型 | 危险链接 | 不应执行 | javascript:alert(1)
:::`)
    );

    expect(safeImage).toContain('src="https://example.com/image-text.png"');
    expect(safeLink).toContain('href="https://example.com/tool"');
    expect(unsafe).not.toContain("javascript:");
  });

  it("renders long images inside a bounded vertical preview viewer", () => {
    const html = renderAdvancedModule(
      parseModule(MODULE_SAMPLES.longimage.markdown)
    );

    expect(html).toContain("max-height:");
    expect(html).toContain("overflow-y:auto");
  });
});
