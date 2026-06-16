import { describe, expect, it, vi } from "vitest";
import { completeDraftMaterials, formatDraft, generateTopics } from "./client";

const workflowId = "22222222-2222-4222-8222-222222222222";
const confirmedWorkflowId = "33333333-3333-4333-8333-333333333333";
const operationId = "11111111-1111-4111-8111-111111111111";

describe("AI client workflow id headers", () => {
  it("sends workflow id as a header and reports confirmed response id", async () => {
    const onWorkflowId = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          topics: [
            {
              id: "topic-1",
              title: "选题一",
              label: "标签",
              angle: "角度",
              summary: "摘要",
              coreViewpoint: "观点",
              targetAudience: "读者",
              reason: "原因",
            },
          ],
          searchStatus: "empty",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Workflow-Id": confirmedWorkflowId,
          },
        }
      )
    );

    await generateTopics(
      workflowId,
      { operationId, idea: "AI 写作" },
      undefined,
      undefined,
      onWorkflowId
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/ai/topics/stream",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-Workflow-Id": workflowId,
        }),
      })
    );
    expect(String(fetchSpy.mock.calls[0]?.[1]?.body)).not.toContain(workflowId);
    expect(onWorkflowId).toHaveBeenCalledWith(confirmedWorkflowId);
  });

  it("posts material completion to the free stream route", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          draft: {
            id: "draft-1-materials-result",
            label: "AI 补充版",
            content: "补充后的正文。",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    await completeDraftMaterials(workflowId, {
      operationId,
      draft: {
        id: "draft-1",
        label: "原始版",
        content: "正文。【💡需要你补充：公开背景】",
      },
      topicLabel: "AI 产品",
      topicAngle: "工程顺序",
      coreViewpoint: "先验证流程。",
      briefObjective: "解释取舍。",
      briefAudience: "产品经理",
      briefPersona: "务实负责人",
      outline: [
        {
          id: "section-1",
          heading: "先验证流程",
          corePoint: "验证路径。",
          supportSuggestion: "补充背景。",
          sectionRole: "核心拆解",
        },
      ],
      searchContext: null,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/ai/complete-materials/stream",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"id":"draft-1"'),
      })
    );
  });

  it("posts draft formatting to the free stream route", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          draft: {
            id: "draft-1-formatted",
            label: "排版版",
            content: "## 小标题\n\n正文。",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    await formatDraft(workflowId, {
      operationId,
      draft: { id: "draft-1", label: "原始版", content: "正文。" },
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/ai/format-draft/stream",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"id":"draft-1"'),
      })
    );
  });
});
