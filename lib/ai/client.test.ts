import { describe, expect, it, vi } from "vitest";
import { generateTopics } from "./client";

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
});
