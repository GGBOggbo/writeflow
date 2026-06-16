import { describe, expect, it } from "vitest";
import { buildOutlinePrompt } from "./outline";

describe("buildOutlinePrompt", () => {
  it("anchors the outline to the selected topic and brief", () => {
    const prompt = buildOutlinePrompt({
      topicId: "topic-1",
      topicLabel: "工程推进视角",
      topicAngle: "从 MVP 到真实 AI 接入的工程推进",
      coreViewpoint: "先跑通主流程，再接真实 AI，才是更稳的工程顺序。",
      targetAudience: "产品经理和 AI 应用开发者",
      reason: "这个切口兼顾工程真实感和可复用方法论，适合做深度复盘。",
      structureType: "痛点拆解型",
      briefObjective: "帮助读者理解 AI 产品从原型到真实接入的工程决策。",
      briefAudience: "产品经理和 AI 应用开发者",
      briefPersona: "一个踩过坑、讲真话的实战派产品负责人",
      briefTone: "清晰、务实、具体",
      briefDropOffPoint: "让读者意识到先跑通主流程再接真实 AI 才是更稳的路线",
      briefConstraints: ["避免空话", "强调流程拆解"],
    });

    expect(prompt.userPrompt).toContain("工程推进视角");
    expect(prompt.userPrompt).toContain("先跑通主流程，再接真实 AI，才是更稳的工程顺序。");
    expect(prompt.userPrompt).toContain("这个切口兼顾工程真实感和可复用方法论");
    expect(prompt.userPrompt).toContain("文章体裁：痛点拆解型");
    expect(prompt.userPrompt).toContain("帮助读者理解 AI 产品从原型到真实接入的工程决策。");
    expect(prompt.userPrompt).toContain("产品经理和 AI 应用开发者");
    expect(prompt.userPrompt).toContain("一个踩过坑、讲真话的实战派产品负责人");
    expect(prompt.userPrompt).toContain("让读者意识到先跑通主流程再接真实 AI 才是更稳的路线");
    expect(prompt.userPrompt).toMatch(/不要偏离这个选题|禁止改写成其他主题/);
    expect(prompt.userPrompt).toContain("3-5 个素材槽位");
    expect(prompt.userPrompt).toMatch(/最后一个节点必须是.*号召|结尾与号召信息/);
    expect(prompt.userPrompt).toContain("SEO 占位铁律");
    expect(prompt.userPrompt).toContain("嵌入到对应大纲节点的 heading");
    expect(prompt.userPrompt).toContain("targetOutlineId");
    expect(prompt.userPrompt).toContain("抛出一个具体的、容易站队或引发吐槽的开放性问句");
    expect(prompt.userPrompt).toContain("heading 控制在 24 个字以内");
    expect(prompt.userPrompt).toContain("corePoint 控制在 1 句话内");
    expect(prompt.userPrompt).toContain("不要写多余铺垫");
    expect(prompt.userPrompt).toContain("只能基于上游已确认的信息搭结构");
    expect(prompt.userPrompt).toContain("不得新增用户没有提到的年份、身份、数据、经历或案例");
  });

  it("injects search context when searchEnabled is true", () => {
    const prompt = buildOutlinePrompt({
      topicId: "topic-1",
      topicLabel: "真实表达视角",
      topicAngle: "真实表达",
      coreViewpoint: "一人公司的挑战不在概念，而在持续承压下的真实执行。",
      targetAudience: "想做个人业务的内容创作者",
      reason: "这个切口能兼顾共鸣和方法论。",
      structureType: "痛点拆解型",
      briefObjective: "打破认知",
      briefAudience: "创业者",
      briefPersona: "实战派",
      briefTone: "务实",
      briefDropOffPoint: "行动号召",
      briefConstraints: ["避免空话"],
      searchEnabled: true,
      searchContext: {
        query: "一人公司 文章结构 大纲",
        intent: "outline",
        results: [
          {
            title: "爆款文章结构拆解",
            snippet: "痛点引入→核心判断→递进分论点→结尾号召。",
            url: "https://example.com/1",
            source: "generic",
          },
        ],
        seoKeywords: ["文章结构", "爆款"],
        crowdedness: "medium",
        staleBuzzwords: ["底层逻辑"],
        notes: [
          "该话题近期结构表达已经趋同，请优先避开模板化的一二三展开。",
          "注意这些词已经容易让用户审美疲劳：底层逻辑。请执行“意思不变，换一种用户没见过的新说法”。",
        ],
      },
    });

    expect(prompt.userPrompt).toContain("最新结构参考");
    expect(prompt.userPrompt).toContain("质量警告");
    expect(prompt.userPrompt).toContain("[Bocha/Web] 爆款文章结构拆解");
    expect(prompt.userPrompt).toContain("可参考的搜索关键词：文章结构、爆款");
    expect(prompt.userPrompt).toContain("该话题近期结构表达已经趋同");
    expect(prompt.userPrompt).toContain("底层逻辑");
    expect(prompt.userPrompt).not.toContain("读 ?");
    expect(prompt.userPrompt).not.toContain("赞 ?");
    expect(prompt.userPrompt).not.toContain("藏 ?");
  });

  it("omits search context when searchEnabled is false", () => {
    const prompt = buildOutlinePrompt({
      topicId: "topic-1",
      topicLabel: "真实表达视角",
      topicAngle: "真实表达",
      coreViewpoint: "探讨一人公司的真实挑战。",
      targetAudience: "想做个人业务的内容创作者",
      reason: "这个切口能兼顾共鸣和方法论。",
      structureType: "痛点拆解型",
      briefObjective: "打破认知",
      briefAudience: "创业者",
      briefPersona: "实战派",
      briefTone: "务实",
      briefDropOffPoint: "行动号召",
      briefConstraints: ["避免空话"],
      searchEnabled: false,
    });

    expect(prompt.userPrompt).not.toContain("=== 最新结构参考");
    expect(prompt.userPrompt).not.toContain("搜索 query");
  });
});
