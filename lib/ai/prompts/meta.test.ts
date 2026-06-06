import { describe, expect, it } from "vitest";
import { buildMetaPrompt } from "./meta";

describe("buildMetaPrompt", () => {
  it("anchors meta generation to the selected topic and draft content", () => {
    const prompt = buildMetaPrompt({
      topicLabel: "工程推进视角",
      coreViewpoint: "真正决定 AI 产品能不能落地的，不是模型有多强，而是流程设计有没有先跑通。",
      topicAngle: "从 MVP 到真实 AI 接入的工程推进",
      structureType: "痛点拆解型",
      briefObjective: "帮助读者理解 AI 产品从原型到真实接入的工程决策。",
      briefAudience: "产品经理和 AI 应用开发者",
      briefPersona: "一个踩过坑、讲真话的实战派产品负责人",
      briefDropOffPoint: "让读者意识到先跑通主流程再接真实 AI 才是更稳的路线",
      draftContent: "先讲清 MVP 主流程为什么比一开始追求完美模型更重要。",
    });

    expect(prompt.userPrompt).toContain("方向标签：工程推进视角");
    expect(prompt.userPrompt).toContain("核心观点：真正决定 AI 产品能不能落地的，不是模型有多强，而是流程设计有没有先跑通。");
    expect(prompt.userPrompt).toContain("先讲清 MVP 主流程");
    expect(prompt.userPrompt).toContain("痛点拆解型");
    expect(prompt.userPrompt).toContain("一个踩过坑、讲真话的实战派产品负责人");
    expect(prompt.userPrompt).toContain("让读者意识到先跑通主流程再接真实 AI 才是更稳的路线");
    expect(prompt.userPrompt).toMatch(/不要偏离这个选题|不要改写成其他主题/);
    expect(prompt.userPrompt).toContain("5 个标题");
    expect(prompt.userPrompt).toContain("3 条摘要");
    expect(prompt.userPrompt).toContain("利益结果型");
    expect(prompt.userPrompt).toContain("场景痛点型");
    expect(prompt.userPrompt).toContain("反常识/认知冲突型");
    expect(prompt.userPrompt).toContain("新机会趋势型");
    expect(prompt.userPrompt).toContain("个人故事/实录型");
    expect(prompt.userPrompt).toContain("痛点共鸣版");
    expect(prompt.userPrompt).toContain("悬念反转版");
    expect(prompt.userPrompt).toContain("专业克制版");
    expect(prompt.userPrompt).toContain("coverSuggestion");
    expect(prompt.userPrompt).toContain("封面配图建议");
    expect(prompt.userPrompt).toContain("900×383px");
    expect(prompt.userPrompt).toContain("证据链");
    expect(prompt.userPrompt).toContain("真实截图");
    expect(prompt.userPrompt).toContain("实拍");
    expect(prompt.userPrompt).toContain("原始粗糙");
    expect(prompt.userPrompt).toContain("高清");
    expect(prompt.userPrompt).toContain("可辨认");
    expect(prompt.userPrompt).toContain("纯白底黑字");
    expect(prompt.userPrompt).toContain("手写便签");
    expect(prompt.userPrompt).toContain("极简金句");
    expect(prompt.userPrompt).toContain("不要推荐生图");
    expect(prompt.userPrompt).toContain("真人元素");
    expect(prompt.userPrompt).toContain("真人露出");
    expect(prompt.userPrompt).toContain("视觉锤复用原则");
    expect(prompt.userPrompt).toContain("固定封面");
    expect(prompt.userPrompt).toContain("信任的稳定");
    expect(prompt.userPrompt).toContain("1 秒");
    expect(prompt.userPrompt).toContain("利益点或痛点");
    expect(prompt.userPrompt).toContain("冲动型点击欲");
    expect(prompt.userPrompt).not.toContain("生图工具");
    expect(prompt.userPrompt).not.toContain("构图层级");
    expect(prompt.userPrompt).not.toContain("文字安全区");
    expect(prompt.userPrompt).not.toContain("色彩氛围");
    expect(prompt.userPrompt).toContain("SEO 标题占位铁律");
    expect(prompt.userPrompt).toContain("绝不能是对正文的平淡总结");
    expect(prompt.userPrompt).toContain("否定句效果永远大于肯定句");
    expect(prompt.userPrompt).toContain("《[目标人群]+[场景]+[方法]+[结果]》");
    expect(prompt.userPrompt).not.toContain("选题 ID");
    expect(prompt.userPrompt).not.toContain("选题标题");
    expect(prompt.userPrompt).not.toContain("选题摘要");
    expect(prompt.userPrompt).not.toContain("当前草稿 ID");
    expect(prompt.userPrompt).not.toContain("当前草稿标签");
  });

  it("injects search references and stale buzzword warnings when search is enabled", () => {
    const prompt = buildMetaPrompt({
      topicLabel: "工程推进视角",
      coreViewpoint: "核心观点",
      topicAngle: "从 MVP 到真实 AI 接入",
      structureType: "痛点拆解型",
      briefObjective: "帮助读者理解工程推进。",
      briefAudience: "产品经理",
      briefPersona: "一个讲真话的实战派前辈",
      briefDropOffPoint: "让读者开始行动",
      draftContent: "正文内容",
      searchEnabled: true,
      searchMode: "default",
      searchContext: {
        query: "从 MVP 到真实 AI 接入 产品经理 痛点 现状",
        intent: "meta",
        crowdedness: "high",
        seoKeywords: ["AI接入", "MVP"],
        staleBuzzwords: ["底层逻辑"],
        notes: ["该话题近期讨论过密，请换一种新说法。"],
        results: [
          {
            title: "做了 10 篇都没起量？问题不在模型",
            snippet: "用真实语境提炼标题。",
            url: "https://example.com/1",
            source: "wechat",
            engagementMetrics: {
              readCount: 60000,
              likeCount: 2400,
              collectCount: 1400,
            },
          },
        ],
      },
    });

    expect(prompt.userPrompt).toContain("最新标题参考");
    expect(prompt.userPrompt).toContain("质量警告");
    expect(prompt.userPrompt).toContain("做了 10 篇都没起量？问题不在模型");
    expect(prompt.userPrompt).toContain("建议自然参考这些搜索关键词：AI接入、MVP");
    expect(prompt.userPrompt).toContain("必须将最核心的 SEO 关键词自然无痕地融入标题");
    expect(prompt.userPrompt).toContain("已疲劳烂词");
  });
});
