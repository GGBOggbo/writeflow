import { describe, expect, it } from "vitest";
import {
  ADVANCED_MODULE_NAMES,
  parseAdvancedMarkdown,
  type AdvancedModuleName,
  type AdvancedModuleNode,
} from "@/lib/markdown/advanced-modules";
import { renderAdvancedModule } from "./advanced-module-render";

const MODULE_SAMPLES: Record<
  AdvancedModuleName,
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
  it.each(ADVANCED_MODULE_NAMES)(
    "renders the %s module with its own action id and visible content",
    (name) => {
      const sample = MODULE_SAMPLES[name];
      const html = renderAdvancedModule(parseModule(sample.markdown));

      expect(html).toContain(`data-mpa-action-id="${name}"`);
      expect(html).toContain(sample.expected);
      expect(html).toContain("style=");
      expect(html).not.toContain(":::");
    }
  );

  it("uses the shared wechat-native visual contract", () => {
    const html = renderAdvancedModule(parseModule(MODULE_SAMPLES.hero.markdown));

    expect(html).toContain("font-family:");
    expect(html).toContain("border-radius:");
    expect(html).toContain("#1f5f46");
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
});
