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

  it("formats a draft as plain Markdown with deepseek pro", async () => {
    vi.resetModules();
    vi.stubEnv("DEEPSEEK_API_KEY", "test-key");
    vi.stubEnv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1");
    vi.stubEnv("DEEPSEEK_MODEL", "deepseek-v4-flash");
    const fetchSpy = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "```markdown\n## 真正的问题\n\n**这事没那么玄。**\n```" } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchSpy);
    const { createRealAIProvider } = await import("./real-provider");

    const result = await createRealAIProvider("deepseek").formatDraftMarkdown(
      "真正的问题。\n\n这事没那么玄。"
    );

    expect(result).toBe("## 真正的问题\n\n**这事没那么玄。**");
    const request = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body));
    expect(request.model).toBe("deepseek-v4-pro");
    expect(request.max_completion_tokens).toBe(4096);
    expect(request.messages[0].content).not.toContain("只返回 JSON");
    expect(request.messages[1].content).not.toContain("JSON 结构");
    expect(request.messages[1].content).toContain("待排版纯正文");
  });

  it("passes layout quality feedback to a Markdown formatting retry", async () => {
    vi.resetModules();
    vi.stubEnv("DEEPSEEK_API_KEY", "test-key");
    vi.stubEnv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1");
    const fetchSpy = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "## 修正后\n\n**正文内容。**" } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchSpy);
    const { createRealAIProvider } = await import("./real-provider");

    await createRealAIProvider("deepseek").formatDraftMarkdown("正文内容。", {
      qualityFeedback: "上一次结果没有 Markdown 标题。",
    });

    const request = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body));
    expect(request.messages[1].content).toContain("上一次排版不合格");
    expect(request.messages[1].content).toContain(
      "上一次结果没有 Markdown 标题。"
    );
  });

  it("retries Markdown formatting when the provider reports a length cutoff", async () => {
    vi.resetModules();
    vi.stubEnv("DEEPSEEK_API_KEY", "test-key");
    vi.stubEnv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1");
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                finish_reason: "length",
                message: { content: "## 被截断\n\n**只有半篇" },
              },
            ],
            usage: { completion_tokens: 4096 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                finish_reason: "stop",
                message: { content: "## 完整正文\n\n**这次完整返回。**" },
              },
            ],
            usage: { completion_tokens: 120 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
    vi.stubGlobal("fetch", fetchSpy);
    const { createRealAIProvider } = await import("./real-provider");

    const result = await createRealAIProvider("deepseek").formatDraftMarkdown(
      "完整正文。"
    );

    expect(result).toBe("## 完整正文\n\n**这次完整返回。**");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("rejects Markdown formatting when every response is truncated", async () => {
    vi.resetModules();
    vi.stubEnv("DEEPSEEK_API_KEY", "test-key");
    vi.stubEnv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1");
    const truncatedResponse = () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              finish_reason: "length",
              message: { content: "## 被截断\n\n**只有半篇" },
            },
          ],
          usage: { completion_tokens: 4096 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(truncatedResponse())
      .mockResolvedValueOnce(truncatedResponse());
    vi.stubGlobal("fetch", fetchSpy);
    const { createRealAIProvider } = await import("./real-provider");

    await expect(
      createRealAIProvider("deepseek").formatDraftMarkdown("完整正文。")
    ).rejects.toThrow("输出因长度限制被截断");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("completes draft materials with deepseek pro", async () => {
    vi.resetModules();
    vi.stubEnv("DEEPSEEK_API_KEY", "test-key");
    vi.stubEnv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1");
    vi.stubEnv("DEEPSEEK_MODEL", "deepseek-v4-flash");
    const fetchSpy = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({
            drafts: [{
              id: "draft-1",
              label: "原始版",
              content: "开头。这里是一段有资料支持的工程背景补充。结尾。",
            }],
          }) } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchSpy);
    const { createRealAIProvider } = await import("./real-provider");

    await createRealAIProvider("deepseek").completeDraftMaterials({
      draft: {
        id: "draft-1",
        label: "原始版",
        content: "开头。【💡需要你补充：工程背景】结尾。",
      },
      topicLabel: "AI 产品",
      topicAngle: "工程顺序",
      coreViewpoint: "先验证流程。",
      briefObjective: "解释取舍。",
      briefAudience: "产品经理",
      briefPersona: "务实负责人",
      outline: [{
        id: "section-1",
        heading: "先验证流程",
        corePoint: "验证路径。",
        supportSuggestion: "补充背景。",
        sectionRole: "核心拆解",
      }],
      searchContext: null,
    });

    const request = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body));
    expect(request.model).toBe("deepseek-v4-pro");
    expect(request.messages[0].content).toContain("谨慎的中文公众号资料编辑");
  });

});
