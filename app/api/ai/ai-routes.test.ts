import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as aiService from "@/lib/ai/service";
import { topicRequestSchema } from "@/lib/ai/schemas";
import { streamJsonResponse } from "./_stream";
import { getLogContext } from "@/lib/logging/context";
import { POST as postTopics } from "./topics/route";
import { POST as postTopicsStream } from "./topics/stream/route";
import { POST as postHumanize } from "./humanize/route";

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

  it("charges a separate humanize credit after draft delivery", async () => {
    const request = new Request("http://localhost:3000/api/ai/humanize", {
      method: "POST",
      body: JSON.stringify({
        operationId,
        draft: { id: "draft-1", label: "原始版", content: "原始正文。" },
        coreViewpoint: "先验证再优化。",
        briefPersona: "实战派负责人",
        briefTone: "务实",
        briefDropOffPoint: "让读者先行动。",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await postHumanize(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.draft.label).toBe("去 AI 版");
    expect(creditMocks.reserve).toHaveBeenCalledWith(
      "test-user",
      "humanize",
      operationId
    );
    expect(creditMocks.consume).toHaveBeenCalledWith(
      "test-user",
      operationId
    );
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
