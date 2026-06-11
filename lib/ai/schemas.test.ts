import { describe, expect, it } from "vitest";
import {
  briefRequestSchema,
  briefResponseSchema,
  metaResponseSchema,
  outlineRequestSchema,
  outlineResponseSchema,
  topicRequestSchema,
  topicResponseSchema,
} from "./schemas";

describe("AI schemas", () => {
  const operationId = "11111111-1111-4111-8111-111111111111";

  it("accepts a valid topic generation request", () => {
    const result = topicRequestSchema.safeParse({
      operationId,
      idea: "公众号 AI 写作流程",
    });

    expect(result.success).toBe(true);
  });

  it("requires structureType in a valid outline generation request", () => {
    const result = outlineRequestSchema.safeParse({
      operationId,
      topicId: "topic-1",
      topicLabel: "产品结构视角",
      topicAngle: "从产品结构切入",
      coreViewpoint: "先跑通主流程，再扩能力层，才是更稳的推进方式。",
      targetAudience: "内容创作者",
      reason: "这个切口适合做结构化拆解。",
      structureType: "痛点拆解型",
      briefObjective: "帮助读者快速理解产品结构。",
      briefAudience: "内容创作者",
      briefPersona: "一个踩过坑的实战派前辈",
      briefTone: "具体、直接",
      briefDropOffPoint: "让读者意识到先跑通主流程比急着堆功能更重要",
      briefConstraints: ["不要空话"],
    });

    expect(result.success).toBe(true);
  });

  it("requires structureType in a valid brief generation request", () => {
    const result = briefRequestSchema.safeParse({
      operationId,
      topicId: "topic-1",
      topicLabel: "产品结构视角",
      topicAngle: "从产品结构切入",
      coreViewpoint: "先跑通主流程，再扩能力层，才是更稳的推进方式。",
      targetAudience: "内容创作者",
      reason: "这个切口适合做结构化拆解。",
      structureType: "清单干货型",
    });

    expect(result.success).toBe(true);
  });

  it("requires a UUID operation id for metered requests", () => {
    expect(
      topicRequestSchema.safeParse({
        operationId: "not-a-uuid",
        idea: "公众号 AI 写作流程",
      }).success
    ).toBe(false);
  });

  it("normalizes topic responses into the new structured topic fields", () => {
    const result = topicResponseSchema.parse({
      topics: [
        {
          id: "topic-1",
          title: "AI 写作工作流的增长打法",
          angle: "从执行顺序切入，强调可落地性",
          summary: "适合写成方法论文章，突出阶段拆解和行动建议。",
        },
      ],
    });

    expect(result.topics[0]).toMatchObject({
      label: "AI 写作工作流的增长打法",
      coreViewpoint: "适合写成方法论文章，突出阶段拆解和行动建议。",
    });
  });

  it("requires persona and dropOffPoint in brief responses", () => {
    expect(() =>
      briefResponseSchema.parse({
        brief: {
          objective: "让读者意识到 AI 写作工作流真正卡点在流程设计。",
          audience: "内容创作者",
          tone: "像朋友聊天一样具体直接",
          constraints: ["必须提供真实场景", "不要空话"],
        },
      })
    ).toThrow();
  });

  it("rejects blank persona and dropOffPoint in brief responses", () => {
    expect(() =>
      briefResponseSchema.parse({
        brief: {
          objective: "让读者意识到 AI 写作工作流真正卡点在流程设计。",
          audience: "内容创作者",
          persona: "   ",
          tone: "像朋友聊天一样具体直接",
          dropOffPoint: "",
          constraints: ["必须提供真实场景", "不要空话"],
        },
      })
    ).toThrow();
  });

  it("requires material slots to bind to a concrete outline node", () => {
    expect(() =>
      outlineResponseSchema.parse({
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
            label: "案例证据",
            content: "补一个真实开发迭代片段。",
            purpose: "增强真实感",
          },
        ],
      })
    ).toThrow();
  });

  it("requires coverSuggestion in meta responses", () => {
    expect(() =>
      metaResponseSchema.parse({
        titles: [
          { id: "title-1", label: "利益结果型", content: "标题 1" },
          { id: "title-2", label: "场景痛点型", content: "标题 2" },
          { id: "title-3", label: "反常识/认知冲突型", content: "标题 3" },
          { id: "title-4", label: "新机会趋势型", content: "标题 4" },
          { id: "title-5", label: "个人故事/实录型", content: "标题 5" },
        ],
        summaries: [
          { id: "summary-1", label: "痛点共鸣版", content: "摘要 1" },
          { id: "summary-2", label: "悬念反转版", content: "摘要 2" },
          { id: "summary-3", label: "专业克制版", content: "摘要 3" },
        ],
      })
    ).toThrow();
  });
});
