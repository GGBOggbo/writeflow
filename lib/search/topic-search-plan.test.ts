import { describe, expect, it } from "vitest";
import {
  buildFallbackTopicSearchPlan,
  topicSearchPlanSchema,
} from "./topic-search-plan";

describe("buildFallbackTopicSearchPlan", () => {
  it.each(["GPT-5.6", "Claude 5", "iPhone 18 Pro", "张小龙"]) (
    "preserves a clear entity: %s",
    (idea) => {
      const plan = buildFallbackTopicSearchPlan(idea);

      expect(plan.coreTopic).toBe(idea);
      expect(plan.historyKeyword).toContain(idea);
      expect(plan.realtimeKeyword).toContain(idea);
      expect(plan.requiredTerms).toContain(idea);
      expect(topicSearchPlanSchema.parse(plan)).toEqual(plan);
    }
  );

  it("keeps versioned entities intact when removing business instructions", () => {
    const plan = buildFallbackTopicSearchPlan(
      "我想写一篇关于 GPT-5.6 的公众号爆款选题，重点聊普通职场人的转型焦虑。"
    );

    expect(plan.requiredTerms).toContain("GPT-5.6");
    expect(plan.realtimeKeyword).toContain("GPT-5.6");
    expect(plan.realtimeKeyword).not.toContain("公众号");
    expect(plan.realtimeKeyword).not.toContain("爆款选题");
  });

  it("builds a bounded safe plan for a long idea", () => {
    const idea = [
      "最近公司开始推动 AI 工具，我试用了 GPT-5.6。",
      "团队里的普通员工很焦虑，担心岗位被替代。",
      "我真正想写的不是产品发布新闻，而是职场人应该如何转型。",
      "文章需要谈工作效率、岗位变化和学习路径。",
    ].join("");

    const plan = buildFallbackTopicSearchPlan(idea);

    expect(plan.requiredTerms).toContain("GPT-5.6");
    expect(plan.realtimeKeyword).toContain("GPT-5.6");
    expect(plan.realtimeKeyword.length).toBeLessThanOrEqual(120);
    expect(plan.historyKeyword.length).toBeLessThanOrEqual(60);
    expect(plan.excludedTerms).toEqual([]);
  });
});
