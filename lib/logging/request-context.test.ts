import { describe, expect, it, vi } from "vitest";
import { getLogContext } from "./context";
import {
  buildRequestLogContext,
  hashUserId,
  withRequestLogContext,
} from "./request-context";

const workflowId = "22222222-2222-4222-8222-222222222222";

describe("request log context", () => {
  it("uses a valid client workflow id and captures platform id", () => {
    const request = new Request("http://localhost:3000/api/ai/topics", {
      headers: {
        "x-workflow-id": workflowId,
        "x-vercel-id": "iad1::abc",
      },
    });

    const context = buildRequestLogContext(request);

    expect(context).toMatchObject({
      workflowId,
      workflowIdSource: "client",
      route: "/api/ai/topics",
      platformRequestId: "iad1::abc",
    });
    expect(context.requestId).toMatch(/[0-9a-f-]{36}/);
  });

  it("generates a workflow id when the header is missing or invalid", () => {
    const request = new Request("http://localhost:3000/api/ai/topics", {
      headers: { "x-workflow-id": "not-a-uuid" },
    });

    const context = buildRequestLogContext(request);

    expect(context.workflowId).toMatch(/[0-9a-f-]{36}/);
    expect(context.workflowIdSource).toBe("generated");
  });

  it("hashes user ids with LOG_HASH_SECRET and never returns the raw id", async () => {
    vi.stubEnv("LOG_HASH_SECRET", "test-secret");

    const hash = await hashUserId("test-user");

    expect(hash).toMatch(/^[0-9a-f]{16}$/);
    expect(hash).not.toBe("test-user");
  });

  it("runs callbacks inside the request context", async () => {
    const request = new Request("http://localhost:3000/api/ai/topics", {
      headers: { "x-workflow-id": workflowId },
    });

    const context = await withRequestLogContext(request, async (initialContext) => {
      expect(initialContext.workflowId).toBe(workflowId);
      return getLogContext();
    });

    expect(context).toMatchObject({ workflowId, workflowIdSource: "client" });
  });
});
