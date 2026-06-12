import { afterEach, describe, expect, it, vi } from "vitest";
import { runWithLogContext } from "@/lib/logging/context";
import { capturePinoOutput } from "@/lib/logging/test-utils";

describe("real provider logging", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("logs prompt and response sizes without leaking prompt or response text", async () => {
    vi.resetModules();
    vi.stubEnv("LOG_LEVEL", "debug");
    vi.stubEnv("LOG_FORMAT", "json");
    vi.stubEnv("MIMO_API_KEY", "test-key");
    vi.stubEnv("MIMO_BASE_URL", "https://token-plan-cn.xiaomimimo.com/v1");
    vi.stubEnv("MIMO_MODEL", "mimo-v2.5-pro");
    const capture = capturePinoOutput();
    const { createRealAIProvider } = await import("./real-provider");
    const responseContent = JSON.stringify({
      coreTopic: "SAFE_CORE",
      historyKeyword: "SAFE_HISTORY",
      realtimeKeyword: "SAFE_REALTIME",
      requiredTerms: ["SAFE_REQUIRED"],
      relatedTerms: ["SAFE_RELATED"],
      excludedTerms: [],
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: responseContent } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    await runWithLogContext(
      {
        requestId: "request-a",
        workflowId: "workflow-a",
        workflowIdSource: "client",
      },
      () => createRealAIProvider("mimo").planTopicSearch("SECRET_USER_PROMPT")
    );

    const logs = capture.output();
    capture.restore();
    expect(logs).toContain('"event":"ai.request.started"');
    expect(logs).toContain('"event":"ai.request.succeeded"');
    expect(logs).toContain('"systemPromptChars"');
    expect(logs).toContain('"userPromptChars"');
    expect(logs).toContain('"responseChars"');
    expect(logs).not.toContain("SECRET_USER_PROMPT");
    expect(logs).not.toContain("SAFE_CORE");
    expect(logs).not.toContain("SAFE_HISTORY");
  });
});
