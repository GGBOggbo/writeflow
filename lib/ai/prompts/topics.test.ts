import { describe, expect, it } from "vitest";
import { buildTopicsPrompt } from "./topics";

describe("buildTopicsPrompt", () => {
  it("pushes topic generation toward audience, scenario, survival-level pain points, and editor judgment", () => {
    const prompt = buildTopicsPrompt({
      idea: "AI 写作工作流",
    });

    expect(prompt.userPrompt).toContain("【3 个】");
    expect(prompt.userPrompt).toContain("目标读者");
    expect(prompt.userPrompt).toContain("核心场景");
    expect(prompt.userPrompt).toContain("生存级痛点");
    expect(prompt.userPrompt).toContain("严禁生成不痛不痒的伪需求");
    expect(prompt.userPrompt).toContain("推荐理由");
    expect(prompt.userPrompt).toContain("内部工作代号");
    expect(prompt.userPrompt).not.toContain("真正可做文章标题");
    expect(prompt.userPrompt).toContain("SEO 占位铁律");
    expect(prompt.userPrompt).toContain("在 label 中提炼 1-2 个核心词");
    expect(prompt.userPrompt).toMatch(/输入极短|输入极长/);
    expect(prompt.userPrompt).toMatch(/切忌生成大而全的泛泛方向|不要生成大而全的泛泛方向/);
  });

  it("injects fresh search references when search is enabled", () => {
    const prompt = buildTopicsPrompt({
      idea: "AI 写作工作流",
      searchEnabled: true,
      searchMode: "default",
      searchContext: {
        status: "success",
        query: "AI 写作工作流 公众号 选题 痛点 最新",
        intent: "topics",
        freshness: "pastMonth",
        crowdedness: "high",
        seoKeywords: ["AI写作", "工作流"],
        staleBuzzwords: ["底层逻辑"],
        notes: [
          "该话题近期讨论过密，请保留意思，但必须换一种更新、更具体、更少见的大白话表达。",
          "注意这些词已经容易让用户审美疲劳：底层逻辑。请执行“意思不变，换一种用户没见过的新说法”。",
        ],
        results: [
          {
            title: "AI 写作工作流的 3 个真痛点",
            snippet: "围绕真实痛点和平台语境给选题加热。",
            url: "https://example.com/1",
            source: "wechat",
            engagementMetrics: {
              readCount: 50000,
              likeCount: 1200,
              lookingCount: 300,
              shareCount: 90,
              collectCount: 800,
              commentCount: 42,
            },
          },
        ],
      },
    });

    expect(prompt.userPrompt).toContain("最新参考信息");
    expect(prompt.userPrompt).toContain("AI 写作工作流的 3 个真痛点");
    expect(prompt.userPrompt).toContain("在看 300");
    expect(prompt.userPrompt).toContain("转 90");
    expect(prompt.userPrompt).toContain("评 42");
    expect(prompt.userPrompt).toContain("可参考的搜索关键词：AI写作、工作流");
    expect(prompt.userPrompt).toContain("质量警告");
    expect(prompt.userPrompt).toContain("该话题近期讨论过密");
    expect(prompt.userPrompt).toContain("底层逻辑");
    expect(prompt.userPrompt).toContain("只作参考");
  });

  it("omits placeholder engagement marks when search results do not include metrics", () => {
    const prompt = buildTopicsPrompt({
      idea: "AI 写作工作流",
      searchEnabled: true,
      searchMode: "default",
      searchContext: {
        status: "success",
        query: "AI 写作工作流 选题 痛点",
        intent: "topics",
        freshness: "pastMonth",
        crowdedness: "low",
        seoKeywords: [],
        staleBuzzwords: [],
        notes: [],
        results: [
          {
            title: "用户真正会主动搜索的问题",
            snippet: "从用户会主动搜索和愿意付费解决的问题里找切口。",
            url: "https://example.com/2",
            source: "generic",
          },
        ],
      },
    });

    expect(prompt.userPrompt).toContain("[Bocha/Web] 用户真正会主动搜索的问题");
    expect(prompt.userPrompt).not.toContain("读 ?");
    expect(prompt.userPrompt).not.toContain("赞 ?");
    expect(prompt.userPrompt).not.toContain("藏 ?");
  });
});
