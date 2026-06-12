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

  it("uses flash only for topic search planning and pro for other deepseek calls", async () => {
    vi.resetModules();
    vi.stubEnv("DEEPSEEK_API_KEY", "test-key");
    vi.stubEnv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1");
    vi.stubEnv("DEEPSEEK_MODEL", "deepseek-v4-flash");
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify({
              coreTopic: "Claude 神话模型",
              historyKeyword: "Claude",
              realtimeKeyword: "Claude 神话模型",
              requiredTerms: ["Claude"],
              relatedTerms: ["神话模型"],
              excludedTerms: [],
            }) } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify({
              brief: {
                objective: "讲清楚模型选择",
                audience: "内容创作者",
                persona: "主编",
                tone: "直接",
                dropOffPoint: "知道何时用 pro",
                constraints: ["保持具体"],
              },
            }) } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
    vi.stubGlobal("fetch", fetchSpy);
    const { createRealAIProvider } = await import("./real-provider");

    const provider = createRealAIProvider("deepseek");
    await provider.planTopicSearch("Claude神话模型");
    await provider.generateBrief({
      topicId: "topic-1",
      topicLabel: "模型选择",
      topicAngle: "成本与质量",
      coreViewpoint: "意图识别用 flash，正文链路用 pro。",
      targetAudience: "内容创作者",
      reason: "避免质量掉档。",
      structureType: "清单干货型",
      searchEnabled: false,
    });

    const models = fetchSpy.mock.calls.map((call) =>
      JSON.parse(String(call[1]?.body)).model
    );
    expect(models).toEqual(["deepseek-v4-flash", "deepseek-v4-pro"]);
  });
});
