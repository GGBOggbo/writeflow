import { describe, expect, it } from "vitest";
import { buildBriefPrompt } from "./brief";

describe("buildBriefPrompt", () => {
  it("anchors the brief to the selected topic details", () => {
    const prompt = buildBriefPrompt({
      topicId: "topic-1",
      topicLabel: "工程推进视角",
      topicAngle: "从 MVP 到真实 AI 接入的工程推进",
      coreViewpoint: "先跑通主流程，再接真实 AI，才是更稳的工程顺序。",
      targetAudience: "产品经理和 AI 应用开发者",
      reason: "这个切口兼顾工程真实感和可复用方法论，适合做深度复盘。",
      structureType: "清单干货型",
    });

    expect(prompt.userPrompt).toContain("工程推进视角");
    expect(prompt.userPrompt).toContain("从 MVP 到真实 AI 接入的工程推进");
    expect(prompt.userPrompt).toContain("先跑通主流程，再接真实 AI，才是更稳的工程顺序。");
    expect(prompt.userPrompt).toContain("产品经理和 AI 应用开发者");
    expect(prompt.userPrompt).toContain("这个切口兼顾工程真实感和可复用方法论");
    expect(prompt.userPrompt).toContain("文章体裁：清单干货型");
    expect(prompt.userPrompt).toContain("IP 人设（persona）");
    expect(prompt.userPrompt).toContain("语气基调（tone）");
    expect(prompt.userPrompt).toContain("核心价值观/信仰");
    expect(prompt.userPrompt).toContain("商业落脚点");
    expect(prompt.userPrompt).toContain("真实案例");
    expect(prompt.userPrompt).toContain("SEO 强制传递");
    expect(prompt.userPrompt).toContain("constraints 数组中单列一条指令");
    expect(prompt.userPrompt).toMatch(/不要改写成其他主题|禁止偏离选题/);
    expect(prompt.userPrompt).toContain("只能基于上游已确认的信息展开");
    expect(prompt.userPrompt).toContain("不得新增用户没有提到的年份、身份、数据、经历或案例");
  });

  it("injects search context when searchEnabled is true", () => {
    const prompt = buildBriefPrompt({
      topicId: "topic-1",
      topicLabel: "真实表达视角",
      topicAngle: "真实表达",
      coreViewpoint: "一人公司的挑战不在概念，而在持续承压下的真实执行。",
      targetAudience: "想做个人业务的内容创作者",
      reason: "这个切口能兼顾共鸣和方法论。",
      structureType: "故事案例型",
      searchEnabled: true,
      searchContext: {
        query: "一人公司 公众号 痛点",
        intent: "brief",
        results: [
          {
            title: "一人公司不是你想象的那样",
            snippet: "真实经历分享，踩过的坑。",
            url: "https://example.com/1",
            source: "wechat",
            engagementMetrics: { readCount: 10000, likeCount: 500, collectCount: 200 },
          },
        ],
        seoKeywords: ["一人公司", "真实经历"],
        crowdedness: "medium",
        staleBuzzwords: [],
        notes: ["注意避免空泛表达。"],
      },
    });

    expect(prompt.userPrompt).toContain("最新参考信息");
    expect(prompt.userPrompt).toContain("一人公司不是你想象的那样");
    expect(prompt.userPrompt).toContain("读 10000");
    expect(prompt.userPrompt).toContain("可参考的搜索关键词：一人公司、真实经历");
    expect(prompt.userPrompt).toContain("SEO 强制传递");
    expect(prompt.userPrompt).toContain("注意避免空泛表达。");
  });

  it("omits search context when searchEnabled is false", () => {
    const prompt = buildBriefPrompt({
      topicId: "topic-1",
      topicLabel: "真实表达视角",
      topicAngle: "真实表达",
      coreViewpoint: "探讨一人公司的真实挑战。",
      targetAudience: "想做个人业务的内容创作者",
      reason: "这个切口能兼顾共鸣和方法论。",
      structureType: "故事案例型",
      searchEnabled: false,
    });

    expect(prompt.userPrompt).not.toContain("=== 最新参考信息");
    expect(prompt.userPrompt).not.toContain("搜索 query");
  });
});
