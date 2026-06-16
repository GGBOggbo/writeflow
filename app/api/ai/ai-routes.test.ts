import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as aiService from "@/lib/ai/service";
import { topicRequestSchema } from "@/lib/ai/schemas";
import { streamJsonResponse } from "./_stream";
import { getLogContext } from "@/lib/logging/context";
import { POST as postTopics } from "./topics/route";
import { POST as postTopicsStream } from "./topics/stream/route";
import { POST as postCompleteMaterialsStream } from "./complete-materials/stream/route";
import { POST as postFormatDraftStream } from "./format-draft/stream/route";
import { POST as postDraft } from "./draft/route";

const creditMocks = vi.hoisted(() => ({
  reserve: vi.fn(),
  consume: vi.fn(),
  refund: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue({
        user: { id: "test-user" },
      }),
    },
  },
}));

vi.mock("@/lib/credits", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/credits")>();
  return {
    ...actual,
    creditStore: creditMocks,
  };
});

const operationId = "11111111-1111-4111-8111-111111111111";
const workflowId = "22222222-2222-4222-8222-222222222222";

describe("AI routes", () => {
  beforeEach(() => {
    creditMocks.reserve.mockReset().mockReturnValue({
      unlimited: false,
      remaining: 4,
    });
    creditMocks.consume.mockReset().mockReturnValue({
      unlimited: false,
      remaining: 4,
    });
    creditMocks.refund.mockReset().mockReturnValue({
      unlimited: false,
      remaining: 5,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("charges a credit when the topics route succeeds", async () => {
    let handlerContext: ReturnType<typeof getLogContext>;
    vi.spyOn(aiService, "generateTopics").mockImplementationOnce(async () => {
      handlerContext = getLogContext();
      return {
        topics: [
          {
            id: "topic-1",
            title: "topic",
            label: "label",
            angle: "angle",
            summary: "summary",
            coreViewpoint: "core",
            targetAudience: "audience",
            reason: "reason",
          },
        ],
        searchStatus: "empty",
      };
    });
    const request = new Request("http://localhost:3000/api/ai/topics", {
      method: "POST",
      body: JSON.stringify({
        operationId,
        idea: "公众号 AI 写作流程",
        searchEnabled: true,
      }),
      headers: {
        "content-type": "application/json",
        "x-workflow-id": workflowId,
      },
    });

    const response = await postTopics(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Request-Id")).toMatch(/[0-9a-f-]{36}/);
    expect(response.headers.get("X-Workflow-Id")).toBe(workflowId);
    expect(handlerContext).toMatchObject({
      workflowId,
      operationId,
      stage: "topics",
    });
    expect(json.topics.length).toBeGreaterThan(0);
    expect(response.headers.get("X-Credits-Remaining")).toBe("4");
    expect(creditMocks.reserve).toHaveBeenCalledWith(
      "test-user",
      "topics",
      operationId
    );
    expect(creditMocks.consume).toHaveBeenCalledWith(
      "test-user",
      operationId
    );
    expect(creditMocks.refund).not.toHaveBeenCalled();
    expect(creditMocks.reserve).toHaveBeenCalledTimes(1);
    expect(creditMocks.consume).toHaveBeenCalledTimes(1);
  });

  it("streams the balance and result after charging a credit", async () => {
    const request = new Request("http://localhost:3000/api/ai/topics/stream", {
      method: "POST",
      body: JSON.stringify({
        operationId,
        idea: "公众号 AI 写作流程",
      }),
      headers: {
        "content-type": "application/json",
        "x-workflow-id": workflowId,
      },
    });

    const response = await postTopicsStream(request);
    const text = await response.text();
    const payloads = text
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));

    expect(response.headers.get("Content-Type")).toContain("application/x-ndjson");
    expect(response.headers.get("X-Request-Id")).toMatch(/[0-9a-f-]{36}/);
    expect(response.headers.get("X-Workflow-Id")).toBe(workflowId);
    expect(payloads.some((payload) => payload.type === "progress")).toBe(true);
    expect(payloads.some((payload) => payload.type === "credits")).toBe(true);
    expect(payloads[payloads.length - 1].type).toBe("result");
    expect(creditMocks.reserve).toHaveBeenCalledWith(
      "test-user",
      "topics",
      operationId
    );
    expect(creditMocks.consume).toHaveBeenCalledWith(
      "test-user",
      operationId
    );
    expect(creditMocks.reserve).toHaveBeenCalledTimes(1);
    expect(creditMocks.consume).toHaveBeenCalledTimes(1);
  });

  it("confirms a generated workflow id when the client omits it", async () => {
    const request = new Request("http://localhost:3000/api/ai/topics", {
      method: "POST",
      body: JSON.stringify({
        operationId,
        idea: "公众号 AI 写作流程",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await postTopics(request);

    expect(response.headers.get("X-Workflow-Id")).toMatch(/[0-9a-f-]{36}/);
    expect(response.headers.get("X-Request-Id")).toMatch(/[0-9a-f-]{36}/);
  });


  it("charges only one credit for draft generation with internal Markdown formatting", async () => {
    vi.spyOn(aiService, "generateDraft").mockResolvedValueOnce({
      drafts: [
        {
          id: "draft-1",
          label: "原始版",
          content: "## 真正的问题\n\n正文内容。",
        },
      ],
    });
    const request = new Request("http://localhost:3000/api/ai/draft", {
      method: "POST",
      body: JSON.stringify({
        operationId,
        topicId: "topic-1",
        topicLabel: "工程推进",
        topicAngle: "先验证主流程",
        coreViewpoint: "先跑通主流程，再优化模型。",
        targetAudience: "产品经理",
        reason: "这个顺序更稳。",
        structureType: "痛点拆解型",
        briefObjective: "讲清工程顺序。",
        briefAudience: "产品经理",
        briefPersona: "实战派负责人",
        briefTone: "清晰、务实",
        briefDropOffPoint: "让读者先验证主流程。",
        briefConstraints: ["避免空话"],
        outline: [
          {
            id: "section-1",
            heading: "为什么先跑通主流程",
            corePoint: "先验证用户路径。",
            supportSuggestion: "补充真实场景。",
            sectionRole: "痛点引入",
          },
        ],
        materialSlots: [],
      }),
      headers: {
        "content-type": "application/json",
        "x-workflow-id": workflowId,
      },
    });

    const response = await postDraft(request);

    expect(response.status).toBe(200);
    expect(creditMocks.reserve).toHaveBeenCalledWith(
      "test-user",
      "draft",
      operationId
    );
    expect(creditMocks.consume).toHaveBeenCalledWith("test-user", operationId);
    expect(creditMocks.reserve).toHaveBeenCalledTimes(1);
    expect(creditMocks.consume).toHaveBeenCalledTimes(1);
  });

  it("completes draft materials without reserving or consuming credits", async () => {
    vi.spyOn(aiService, "completeDraftMaterials").mockResolvedValueOnce({
      draft: {
        id: "draft-1-materials-result",
        label: "AI 补充版",
        content: "开头。这里是一段资料支持的补充。结尾。",
      },
    });
    const request = new Request(
      "http://localhost:3000/api/ai/complete-materials/stream",
      {
        method: "POST",
        body: JSON.stringify({
          operationId,
          draft: {
            id: "draft-1",
            label: "原始版",
            content: "开头。【💡需要你补充：公开背景】结尾。",
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
        }),
        headers: {
          "content-type": "application/json",
          "x-workflow-id": workflowId,
        },
      }
    );

    const response = await postCompleteMaterialsStream(request);
    const payloads = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));

    expect(response.status).toBe(200);
    expect(payloads.some((payload) => payload.type === "credits")).toBe(false);
    expect(payloads[payloads.length - 1]).toMatchObject({
      type: "result",
      data: { draft: { label: "AI 补充版" } },
    });
    expect(creditMocks.reserve).not.toHaveBeenCalled();
    expect(creditMocks.consume).not.toHaveBeenCalled();
    expect(creditMocks.refund).not.toHaveBeenCalled();
  });

  it("formats a draft without reserving or consuming credits", async () => {
    vi.spyOn(aiService, "formatDraft").mockResolvedValueOnce({
      draft: {
        id: "draft-1-formatted",
        label: "排版版",
        content: "## 小标题\n\n正文。",
      },
    });
    const request = new Request(
      "http://localhost:3000/api/ai/format-draft/stream",
      {
        method: "POST",
        body: JSON.stringify({
          operationId,
          draft: { id: "draft-1", label: "原始版", content: "正文。" },
        }),
        headers: {
          "content-type": "application/json",
          "x-workflow-id": workflowId,
        },
      }
    );

    const response = await postFormatDraftStream(request);
    const payloads = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));

    expect(response.status).toBe(200);
    expect(payloads.some((payload) => payload.type === "credits")).toBe(false);
    expect(payloads.at(-1)).toMatchObject({
      type: "result",
      data: { draft: { label: "排版版" } },
    });
    expect(creditMocks.reserve).not.toHaveBeenCalled();
    expect(creditMocks.consume).not.toHaveBeenCalled();
    expect(creditMocks.refund).not.toHaveBeenCalled();
  });

  it("refunds the reserved credit when JSON generation fails", async () => {
    vi.spyOn(aiService, "generateTopics").mockRejectedValueOnce(
      new Error("provider unavailable")
    );

    const request = new Request("http://localhost:3000/api/ai/topics", {
      method: "POST",
      body: JSON.stringify({
        operationId,
        idea: "real provider",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await postTopics(request);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(String(json.error)).toMatch(/provider unavailable/i);
    expect(creditMocks.refund).toHaveBeenCalledWith(
      "test-user",
      operationId
    );
    expect(creditMocks.consume).not.toHaveBeenCalled();
  });

  it("refunds the reserved credit when streamed generation fails", async () => {
    const request = new Request("http://localhost:3000/api/ai/topics/stream", {
      method: "POST",
      body: JSON.stringify({
        operationId,
        idea: "mimo provider",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await streamJsonResponse(
      request,
      topicRequestSchema,
      "topics",
      async () => {
        throw new Error("provider unavailable");
      }
    );
    const text = await response.text();
    const payloads = text
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));

    expect(
      payloads.some((payload) => payload.type === "error")
    ).toBe(true);
    expect(creditMocks.refund).toHaveBeenCalledWith(
      "test-user",
      operationId
    );
    expect(creditMocks.consume).not.toHaveBeenCalled();
  });
});
