import { describe, expect, it } from "vitest";
import { buildDraftPrompt } from "./draft";

describe("buildDraftPrompt", () => {
  it("anchors the draft to the selected topic, brief, outline, and materials", () => {
    const prompt = buildDraftPrompt({
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
      outline: [
        {
          id: "section-1",
          heading: "为什么先跑通 MVP 主流程",
          corePoint: "先界定用户路径和验证目标。",
          supportSuggestion: "补一个真实开发迭代片段。",
          sectionRole: "痛点引入",
        },
      ],
      materialSlots: [
        {
          id: "slot-1",
          targetOutlineId: "section-1",
          label: "案例证据",
          content: "补一个真实开发迭代片段。",
          placement: "正文核心案例",
          purpose: "让抽象判断落到真实经历。",
        },
      ],
    });

    expect(prompt.userPrompt).toContain("工程推进视角");
    expect(prompt.userPrompt).toContain("先跑通主流程，再接真实 AI，才是更稳的工程顺序。");
    expect(prompt.userPrompt).toContain("这个切口兼顾工程真实感和可复用方法论");
    expect(prompt.userPrompt).toContain("帮助读者理解 AI 产品从原型到真实接入的工程决策。");
    expect(prompt.userPrompt).toContain("为什么先跑通 MVP 主流程");
    expect(prompt.userPrompt).toContain("正文核心案例");
    expect(prompt.userPrompt).toContain("补一个真实开发迭代片段。");
    expect(prompt.userPrompt).toContain("一个踩过坑、讲真话的实战派产品负责人");
    expect(prompt.userPrompt).toContain("让读者意识到先跑通主流程再接真实 AI 才是更稳的路线");
    expect(prompt.userPrompt).toContain("【💡需要你补充：这里写明需要用户补什么】");
    expect(prompt.userPrompt).toMatch(/不要偏离这个选题|不要改写成其他主题/);
    expect(prompt.userPrompt).toMatch(/800-1500 字|800 到 1500 字/);
    expect(prompt.userPrompt).toContain("高频换行原则");
    expect(prompt.userPrompt).toContain("1 篇完整初稿");
  });

  it("includes AI benchmark summaries when search context has deep-dive summaries", () => {
    const prompt = buildDraftPrompt({
      topicId: "topic-1",
      topicLabel: "AI 副业",
      topicAngle: "普通人为什么做不起来",
      coreViewpoint: "真正卡住的不是工具，而是第一步场景。",
      targetAudience: "想用 AI 做副业的新手",
      reason: "有真实痛点和可复用结构。",
      structureType: "痛点拆解型",
      briefObjective: "写出一篇能让新手看懂卡点的文章。",
      briefAudience: "AI 副业新手",
      briefPersona: "踩过坑的实战派前辈",
      briefTone: "真诚、具体",
      briefDropOffPoint: "让读者先从一个真实场景开始。",
      briefConstraints: ["避免空话"],
      outline: [
        {
          id: "hook",
          heading: "先讲清为什么卡住",
          corePoint: "卡点不在工具。",
          supportSuggestion: "补一个真实场景。",
          sectionRole: "痛点引入",
          notes: "卡点不在工具。",
        },
      ],
      materialSlots: [],
      searchEnabled: true,
      searchContext: {
        status: "success",
        query: "AI 副业 痛点",
        intent: "topics",
        freshness: "pastMonth",
        seoKeywords: [],
        crowdedness: "medium",
        staleBuzzwords: [],
        notes: [],
        results: [
          {
            title: "普通人用 AI 做副业，为什么第7天就放弃",
            snippet: "真实复盘。",
            url: "https://mp.weixin.qq.com/s/a",
            source: "wechat",
            benchmarkSummary: {
              userPain: "新手不是不会用工具，而是不知道先解决哪个具体场景。",
              structurePattern: "先用失败场景开头，再拆误区，最后给最小行动。",
              rhythmNotes: "短段密集，判断句多，加粗集中在认知反转处。",
              commentInsights: ["评论区都在问第一步怎么开始"],
              reusableAngles: ["从第7天放弃切入"],
              avoidCopying: ["不要照搬作者个人经历"],
            },
          },
        ],
      },
    });

    expect(prompt.userPrompt).toContain("=== AI 对标拆解摘要（正文必须吸收，不可照搬） ===");
    expect(prompt.userPrompt).toContain("新手不是不会用工具");
    expect(prompt.userPrompt).toContain("短段密集");
    expect(prompt.userPrompt).toContain("从第7天放弃切入");
  });
});
