import { describe, expect, it } from "vitest";
import { mockAIProvider } from "../mock-provider";
import { buildTopicSearchPlanPrompt } from "./topic-search-plan";
import { topicSearchPlanSchema } from "@/lib/search/topic-search-plan";

describe("buildTopicSearchPlanPrompt", () => {
  it("protects exact product names and version numbers", () => {
    const prompt = buildTopicSearchPlanPrompt("GPT-5.6");

    expect(prompt.systemPrompt).toContain("搜索意图");
    expect(prompt.userPrompt).toContain("GPT-5.6");
    expect(prompt.userPrompt).toContain("版本号");
    expect(prompt.userPrompt).toContain("historyKeyword");
    expect(prompt.userPrompt).toContain("realtimeKeyword");
    expect(prompt.userPrompt).toContain("requiredTerms");
    expect(prompt.userPrompt).toContain("excludedTerms");
    expect(prompt.userPrompt).toContain("最多 5 个");
    expect(prompt.userPrompt).toContain("禁止在关键词中添加用户未提及的年份");
  });
});

describe("mockAIProvider.planTopicSearch", () => {
  it("returns a valid search plan", async () => {
    const plan = await mockAIProvider.planTopicSearch("GPT-5.6");

    expect(topicSearchPlanSchema.parse(plan)).toEqual(plan);
    expect(plan.requiredTerms).toContain("GPT-5.6");
  });
});
