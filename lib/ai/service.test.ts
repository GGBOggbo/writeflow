import { afterEach, describe, expect, it, vi } from "vitest";
import {
  generateBrief,
  generateDraft,
  humanizeDraft,
  generateOutline,
  generateTitlesAndSummaries,
  generateTopics,
} from "./service";
import * as searchService from "@/lib/search/service";
import { mockAIProvider } from "./mock-provider";
import { capturePinoOutput } from "@/lib/logging/test-utils";

describe("AI service", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns topic options from the mock provider by default", async () => {
    const result = await generateTopics({
      idea: "公众号 AI 写作流程",
    });

    expect(result.topics.length).toBeGreaterThan(0);
    expect(result.topics[0]).toHaveProperty("title");
  });

  it("uses the configured mock provider", async () => {
    vi.stubEnv("AI_PROVIDER", "mock");

    const result = await generateTopics({
      idea: "配置 provider",
    });

    expect(result.topics[0]?.title).toContain("配置 provider");
  });

  it("plans every enabled topic search before retrieval", async () => {
    vi.stubEnv("AI_PROVIDER", "mock");
    const planSpy = vi.spyOn(mockAIProvider, "planTopicSearch");
    const searchSpy = vi.spyOn(searchService, "searchForTopics").mockResolvedValueOnce({
      status: "empty",
      query: "GPT-5.6",
      intent: "topics",
      freshness: "pastMonth",
      results: [],
      seoKeywords: [],
      crowdedness: "low",
      staleBuzzwords: [],
      notes: [],
    });
    const events: string[] = [];

    await generateTopics(
      {
        idea: "GPT-5.6",
        searchEnabled: true,
        searchMode: "default",
      },
      { onProgress: (event) => events.push(event.stepId) }
    );

    expect(planSpy).toHaveBeenCalledWith("GPT-5.6");
    expect(searchSpy).toHaveBeenCalledWith(
      "GPT-5.6",
      "default",
      expect.any(Function),
      expect.objectContaining({
        coreTopic: "GPT-5.6",
        requiredTerms: ["GPT-5.6"],
      })
    );
    expect(events.slice(0, 2)).toEqual([
      "topic_search_planning_started",
      "topic_search_planning_completed",
    ]);
  });

  it("logs topic planning, reference context, and stage timings", async () => {
    vi.stubEnv("AI_PROVIDER", "mock");
    vi.stubEnv("SEARCH_PROVIDER", "wxrank");
    vi.stubEnv("LOG_LEVEL", "debug");
    const capture = capturePinoOutput();
    vi.spyOn(mockAIProvider, "planTopicSearch").mockResolvedValueOnce({
      coreTopic: "Claude 神话模型",
      historyKeyword: "Claude",
      realtimeKeyword: "Claude 神话模型 2025",
      requiredTerms: ["Claude"],
      relatedTerms: ["神话模型"],
      excludedTerms: [],
    });
    const searchSpy = vi.spyOn(searchService, "searchForTopics").mockResolvedValueOnce({
      status: "success",
      query: "Claude 神话模型 2025",
      intent: "topics",
      freshness: "pastMonth",
      results: [
        {
          title: "历史参考",
          snippet: "摘要",
          url: "https://mp.weixin.qq.com/s/history",
          source: "wechat",
          engagementMetrics: { readCount: 10_000 },
          articleHtml: "<p>不应打印的正文</p>",
          comments: [{ content: "不应打印的评论" }],
        },
        {
          title: "实时参考",
          snippet: "摘要",
          url: "https://mp.weixin.qq.com/s/realtime",
          source: "wechat",
        },
      ],
      seoKeywords: [],
      crowdedness: "low",
      staleBuzzwords: [],
      notes: [],
    });

    await generateTopics({
      idea: "Claude神话模型",
      searchEnabled: true,
      searchMode: "default",
    });

    expect(searchSpy).toHaveBeenCalledWith(
      "Claude神话模型",
      "default",
      undefined,
      expect.objectContaining({
        historyKeyword: "Claude",
        realtimeKeyword: "Claude 神话模型",
        requiredTerms: ["Claude"],
        relatedTerms: ["神话模型"],
      })
    );
    const logs = capture.output();
    capture.restore();
    expect(logs).toContain('"scope":"topics"');
    expect(logs).toContain('"event":"topics.generation.started"');
    expect(logs).toContain('"searchProvider":"wxrank"');
    expect(logs).toContain('"event":"search.plan.completed"');
    expect(logs).toContain('"source":"ai"');
    expect(logs).toContain('"addedTerms":["2025"]');
    expect(logs).toContain('"sanitizedTerms":["2025"]');
    expect(logs).toContain('"realtimeKeyword":"Claude 神话模型"');
    expect(logs).toContain('"event":"search.context.prepared"');
    expect(logs).toContain('"searchResults":2');
    expect(logs).toContain('"history":1');
    expect(logs).toContain('"realtime":1');
    expect(logs).toContain('"promptReferences":2');
    expect(logs).toContain('"withHtml":1');
    expect(logs).toContain('"withComments":1');
    expect(logs).toMatch(/"contextChars":\d+/);
    expect(logs).toContain('"event":"topics.generation.completed"');
    expect(logs).toContain('"topicCount":3');
    expect(logs).toMatch(/"plannerMs":\d+/);
    expect(logs).toMatch(/"searchMs":\d+/);
    expect(logs).toMatch(/"generationMs":\d+/);
    expect(logs).toMatch(/"totalMs":\d+/);
    expect(logs).not.toContain("不应打印的正文");
    expect(logs).not.toContain("不应打印的评论");
  });

  it("falls back to a safe plan when AI search planning fails", async () => {
    vi.stubEnv("AI_PROVIDER", "mock");
    vi.stubEnv("LOG_LEVEL", "warn");
    const capture = capturePinoOutput();
    vi.spyOn(mockAIProvider, "planTopicSearch").mockRejectedValueOnce(
      new Error("planner unavailable")
    );
    const searchSpy = vi.spyOn(searchService, "searchForTopics").mockResolvedValueOnce({
      status: "empty",
      query: "GPT-5.6",
      intent: "topics",
      freshness: "pastMonth",
      results: [],
      seoKeywords: [],
      crowdedness: "low",
      staleBuzzwords: [],
      notes: [],
    });

    const result = await generateTopics({
      idea: "GPT-5.6",
      searchEnabled: true,
      searchMode: "default",
    });

    expect(result.topics).toHaveLength(3);
    expect(searchSpy).toHaveBeenCalledWith(
      "GPT-5.6",
      "default",
      undefined,
      expect.objectContaining({ requiredTerms: ["GPT-5.6"] })
    );
    const logs = capture.output();
    capture.restore();
    expect(logs).toContain('"event":"search.plan.fallback"');
    expect(logs).toContain('"source":"fallback"');
    expect(logs).toContain('"errorType":"Error"');
  });

  it("keeps a valid fallback keyword when the AI plan only adds an unrequested year", async () => {
    vi.stubEnv("AI_PROVIDER", "mock");
    vi.spyOn(mockAIProvider, "planTopicSearch").mockResolvedValueOnce({
      coreTopic: "Claude 神话模型",
      historyKeyword: "2025",
      realtimeKeyword: "2025",
      requiredTerms: ["2025"],
      relatedTerms: ["2025"],
      excludedTerms: [],
    });
    const searchSpy = vi.spyOn(searchService, "searchForTopics").mockResolvedValueOnce({
      status: "empty",
      query: "Claude神话模型",
      intent: "topics",
      freshness: "pastMonth",
      results: [],
      seoKeywords: [],
      crowdedness: "low",
      staleBuzzwords: [],
      notes: [],
    });

    await generateTopics({
      idea: "Claude神话模型",
      searchEnabled: true,
      searchMode: "default",
    });

    expect(searchSpy).toHaveBeenCalledWith(
      "Claude神话模型",
      "default",
      undefined,
      expect.objectContaining({
        historyKeyword: "Claude神话模型",
        realtimeKeyword: "Claude神话模型",
        requiredTerms: ["Claude神话模型"],
        relatedTerms: [],
      })
    );
  });

  it("throws a clear error for unsupported providers", async () => {
    vi.stubEnv("AI_PROVIDER", "real");

    await expect(
      generateTopics({
        idea: "未接入 provider",
      })
    ).rejects.toThrow(/provider|real|未实现/i);
  });

  it("throws a clear error when openai provider is selected without an API key", async () => {
    vi.stubEnv("AI_PROVIDER", "openai");

    await expect(
      generateTopics({
        idea: "OpenAI topics",
      })
    ).rejects.toThrow(/OPENAI_API_KEY|openai/i);
  });

  it("throws a clear error when anthropic provider is selected without an API key", async () => {
    vi.stubEnv("AI_PROVIDER", "anthropic");

    await expect(
      generateTopics({
        idea: "Anthropic topics",
      })
    ).rejects.toThrow(/ANTHROPIC_API_KEY|anthropic/i);
  });

  it("throws a clear error when mimo provider is selected without an API key", async () => {
    vi.stubEnv("AI_PROVIDER", "mimo");

    await expect(
      generateTopics({
        idea: "Mimo topics",
      })
    ).rejects.toThrow(/MIMO_API_KEY|mimo/i);
  });

  it("passes search context to the provider only when search status is success", async () => {
    vi.stubEnv("AI_PROVIDER", "mimo");
    vi.stubEnv("MIMO_API_KEY", "test-key");
    vi.stubEnv("MIMO_BASE_URL", "https://token-plan-cn.xiaomimimo.com/v1");
    vi.stubEnv("MIMO_MODEL", "mimo-v2.5-pro");

    const searchContext = {
      status: "success",
      query: "AI 写作 痛点",
      intent: "topics",
      freshness: "past6Months",
      results: [
        {
          title: "测试结果",
          snippet: "测试摘要",
          url: "https://example.com",
          source: "generic",
        },
      ],
      seoKeywords: ["AI 写作"],
      crowdedness: "low",
      staleBuzzwords: [],
      notes: [],
    } as const;

    vi.spyOn(searchService, "searchForTopics").mockResolvedValueOnce(searchContext);

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    coreTopic: "AI 写作流程",
                    historyKeyword: "AI 写作",
                    realtimeKeyword: "AI 写作流程",
                    requiredTerms: ["AI 写作"],
                    relatedTerms: ["工作流"],
                    excludedTerms: [],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  topics: [
                    {
                      id: "topic-1",
                      title: "AI 写作流程的增长打法",
                      angle: "从流程拆解切入",
                      summary: "强调低成本验证主流程。",
                    },
                  ],
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
      );

    const result = await generateTopics({
      idea: "AI 写作流程",
      searchEnabled: true,
      searchMode: "default",
    });

    expect(result.searchContext).toEqual(searchContext);
    const plannerPayload = JSON.parse(
      String(fetchSpy.mock.calls[0]?.[1]?.body)
    );
    expect(plannerPayload.max_completion_tokens).toBe(500);
    expect(plannerPayload.temperature).toBe(0.15);
    expect(fetchSpy.mock.calls[1]?.[1]?.body).toEqual(
      expect.stringContaining("搜索 query：AI 写作 痛点")
    );
  });

  it("reuses topic search context for brief without running another web search", async () => {
    vi.stubEnv("AI_PROVIDER", "mimo");
    vi.stubEnv("MIMO_API_KEY", "test-key");
    vi.stubEnv("MIMO_BASE_URL", "https://token-plan-cn.xiaomimimo.com/v1");
    vi.stubEnv("MIMO_MODEL", "mimo-v2.5-pro");
    vi.stubEnv("LOG_LEVEL", "info");

    const capture = capturePinoOutput();
    const briefSearchSpy = vi.spyOn(searchService, "searchForBrief");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    coreTopic: "AI 写作流程",
                    historyKeyword: "AI 写作",
                    realtimeKeyword: "AI 写作流程",
                    requiredTerms: ["AI 写作"],
                    relatedTerms: ["工作流"],
                    excludedTerms: [],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  brief: {
                    objective: "复用选题阶段搜索结果",
                    audience: "内容创作者",
                    persona: "一个讲真话的实战派前辈",
                    tone: "具体、直接",
                    dropOffPoint: "让读者知道链接主线比重复搜索更省钱",
                    constraints: ["不要重复 web_search"],
                  },
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
      );

    await generateBrief({
      topicId: "topic-1",
      topicLabel: "链接主线",
      topicAngle: "用文章链接串起后续增强",
      coreViewpoint: "先搜文章，再围绕文章链接补数据。",
      targetAudience: "公众号内容创作者",
      reason: "能明显降低接口成本。",
      structureType: "清单干货型",
      searchEnabled: true,
      searchContext: {
        status: "success",
        query: "AI 写作 痛点",
        intent: "topics",
        freshness: "past6Months",
        results: [
          {
            title: "选题阶段拿到的公众号文章",
            snippet: "后续阶段应该复用这条链接。",
            url: "https://mp.weixin.qq.com/s/topic",
            source: "wechat",
          },
        ],
        seoKeywords: ["AI 写作"],
        crowdedness: "low",
        staleBuzzwords: [],
        notes: [],
      },
    });

    expect(briefSearchSpy).not.toHaveBeenCalled();
    const logs = capture.output();
    capture.restore();
    expect(logs).toContain('"event":"search.context.reused"');
    expect(logs).toContain('"scope":"brief"');
    expect(logs).toContain('"stage":"brief"');
    expect(logs).toContain('"searchResults":1');
    expect(logs).toContain('"promptReferences":1');
    expect(fetchSpy.mock.calls[0]?.[1]?.body).toEqual(
      expect.stringContaining("选题阶段拿到的公众号文章")
    );
  });

  it("logs when later stages cannot reuse topic search context", async () => {
    vi.stubEnv("AI_PROVIDER", "mock");
    vi.stubEnv("LOG_LEVEL", "info");
    const capture = capturePinoOutput();

    await generateBrief({
      topicId: "topic-1",
      topicLabel: "无搜索复用",
      topicAngle: "直接生成",
      coreViewpoint: "没有启用联网。",
      targetAudience: "内容创作者",
      reason: "测试日志。",
      structureType: "清单干货型",
      searchEnabled: false,
    });
    await generateOutline({
      topicId: "topic-1",
      topicLabel: "缺少上下文",
      topicAngle: "需要提示",
      coreViewpoint: "开了搜索但没上下文。",
      targetAudience: "内容创作者",
      reason: "测试日志。",
      structureType: "清单干货型",
      briefObjective: "测试",
      briefAudience: "内容创作者",
      briefPersona: "主编",
      briefTone: "直接",
      briefDropOffPoint: "看日志",
      briefConstraints: [],
      searchEnabled: true,
    });

    const logs = capture.output();
    capture.restore();
    expect(logs).toContain('"event":"search.context.disabled"');
    expect(logs).toContain('"scope":"brief"');
    expect(logs).toContain('"event":"search.context.missing"');
    expect(logs).toContain('"scope":"outline"');
  });

  it("does not pass search context when search status is degraded", async () => {
    vi.stubEnv("AI_PROVIDER", "mimo");
    vi.stubEnv("MIMO_API_KEY", "test-key");
    vi.stubEnv("MIMO_BASE_URL", "https://token-plan-cn.xiaomimimo.com/v1");
    vi.stubEnv("MIMO_MODEL", "mimo-v2.5-pro");

    vi.spyOn(searchService, "searchForTopics").mockResolvedValueOnce({
      status: "degraded",
      query: "AI 写作 痛点",
      intent: "topics",
      freshness: "past6Months",
      results: [],
      seoKeywords: [],
      crowdedness: "low",
      staleBuzzwords: [],
      notes: [],
    });

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    coreTopic: "AI 写作流程",
                    historyKeyword: "AI 写作",
                    realtimeKeyword: "AI 写作流程",
                    requiredTerms: ["AI 写作"],
                    relatedTerms: ["工作流"],
                    excludedTerms: [],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    topics: [
                      {
                        id: "topic-1",
                        title: "AI 写作流程的增长打法",
                        angle: "从流程拆解切入",
                        summary: "强调低成本验证主流程。",
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

    await generateTopics({
      idea: "AI 写作流程",
      searchEnabled: true,
      searchMode: "default",
    });

    expect(fetchSpy.mock.calls[1]?.[1]?.body).not.toEqual(
      expect.stringContaining("搜索 query：AI 写作 痛点")
    );
  });

  it("does not pass search context when search status is empty", async () => {
    vi.stubEnv("AI_PROVIDER", "mimo");
    vi.stubEnv("MIMO_API_KEY", "test-key");
    vi.stubEnv("MIMO_BASE_URL", "https://token-plan-cn.xiaomimimo.com/v1");
    vi.stubEnv("MIMO_MODEL", "mimo-v2.5-pro");

    vi.spyOn(searchService, "searchForTopics").mockResolvedValueOnce({
      status: "empty",
      query: "AI 写作 痛点",
      intent: "topics",
      freshness: "past6Months",
      results: [],
      seoKeywords: [],
      crowdedness: "low",
      staleBuzzwords: [],
      notes: [],
    });

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    coreTopic: "AI 写作流程",
                    historyKeyword: "AI 写作",
                    realtimeKeyword: "AI 写作流程",
                    requiredTerms: ["AI 写作"],
                    relatedTerms: ["工作流"],
                    excludedTerms: [],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  topics: [
                    {
                      id: "topic-1",
                      title: "AI 写作流程的增长打法",
                      angle: "从流程拆解切入",
                      summary: "强调低成本验证主流程。",
                    },
                  ],
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
      );

    await generateTopics({
      idea: "AI 写作流程",
      searchEnabled: true,
      searchMode: "default",
    });

    expect(fetchSpy.mock.calls[1]?.[1]?.body).not.toEqual(
      expect.stringContaining("搜索 query：AI 写作 痛点")
    );
  });

  it("requests topics from mimo using the OpenAI-compatible chat completions endpoint", async () => {
    vi.stubEnv("AI_PROVIDER", "mimo");
    vi.stubEnv("MIMO_API_KEY", "test-key");
    vi.stubEnv("MIMO_BASE_URL", "https://token-plan-cn.xiaomimimo.com/v1");
    vi.stubEnv("MIMO_MODEL", "mimo-v2.5-pro");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  topics: [
                    {
                      id: "topic-1",
                      title: "AI 写作流程的增长打法",
                      angle: "从流程拆解切入",
                      summary: "强调低成本验证主流程。",
                    },
                  ],
                }),
                role: "assistant",
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const result = await generateTopics({
      idea: "AI 写作流程",
    });

    expect(result.topics[0]?.title).toContain("AI 写作流程");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://token-plan-cn.xiaomimimo.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-key",
        }),
      })
    );
    expect(fetchSpy.mock.calls[0]?.[1]?.body).toEqual(
      expect.stringContaining('"max_completion_tokens":4096')
    );
    const requestPayload = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body));
    const userMessage = requestPayload.messages.find(
      (message: { role: string; content: string }) => message.role === "user"
    )?.content;
    expect(userMessage).toContain('"label":"string"');
    expect(userMessage).toContain('"coreViewpoint":"string"');
    expect(userMessage).toContain('"targetAudience":"string"');
    expect(userMessage).toContain('"reason":"string"');
  });

  it("requests brief from mimo using the OpenAI-compatible chat completions endpoint", async () => {
    vi.stubEnv("AI_PROVIDER", "mimo");
    vi.stubEnv("MIMO_API_KEY", "test-key");
    vi.stubEnv("MIMO_BASE_URL", "https://token-plan-cn.xiaomimimo.com/v1");
    vi.stubEnv("MIMO_MODEL", "mimo-v2.5-pro");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  brief: {
                    objective: "帮助团队把 AI 写作原型推进到可用产品",
                    audience: "产品经理和 AI 应用开发者",
                    persona: "一个踩过坑、讲真话的实战派产品负责人",
                    tone: "清晰、务实、具体",
                    dropOffPoint: "让读者意识到先跑通主流程再接真实 AI 才是更稳的路线",
                    constraints: ["避免空话", "强调流程拆解"],
                  },
                }),
                role: "assistant",
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const result = await generateBrief({
      topicId: "topic-1",
      topicLabel: "工程推进视角",
      topicAngle: "从 MVP 到真实 AI 接入的工程推进",
      coreViewpoint: "先跑通主流程，再接真实 AI，才是更稳的工程顺序。",
      targetAudience: "产品经理和 AI 应用开发者",
      reason: "这个切口兼顾工程真实感和可复用方法论，适合做深度复盘。",
      structureType: "清单干货型",
    });

    expect(result.brief.objective).toContain("AI 写作原型");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://token-plan-cn.xiaomimimo.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-key",
        }),
      })
    );
    expect(fetchSpy.mock.calls[0]?.[1]?.body).toEqual(
      expect.stringContaining("工程推进视角")
    );
    expect(fetchSpy.mock.calls[0]?.[1]?.body).toEqual(
      expect.stringContaining("文章体裁：清单干货型")
    );
  });

  it("requests outline from mimo using the selected topic and brief context", async () => {
    vi.stubEnv("AI_PROVIDER", "mimo");
    vi.stubEnv("MIMO_API_KEY", "test-key");
    vi.stubEnv("MIMO_BASE_URL", "https://token-plan-cn.xiaomimimo.com/v1");
    vi.stubEnv("MIMO_MODEL", "mimo-v2.5-pro");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  outline: [
                    {
                      id: "section-1",
                      heading: "为什么先跑通 MVP 主流程",
                      notes: "先界定用户路径和验证目标。",
                    },
                  ],
                  materialSlots: [
                    {
                      id: "slot-1",
                      targetOutlineId: "section-1",
                      label: "案例证据",
                      content: "补一个真实开发迭代片段。",
                    },
                  ],
                }),
                role: "assistant",
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const result = await generateOutline({
      topicId: "topic-1",
      topicLabel: "工程推进视角",
      topicAngle: "从 MVP 到真实 AI 接入的工程推进",
      coreViewpoint: "先跑通主流程，再接真实 AI，才是更稳的工程顺序。",
      targetAudience: "产品经理和 AI 应用开发者",
      reason: "这个切口兼顾工程真实感和可复用方法论，适合做深度复盘。",
      structureType: "痛点拆解型",
      briefObjective: "帮助读者理解 AI 产品从原型到真实接入的工程决策。",
      briefAudience: "产品经理和 AI 应用开发者",
      briefPersona: "一个踩过坑、讲真话的实战派产品负责人",
      briefTone: "清晰、务实、具体",
      briefDropOffPoint: "让读者意识到先跑通主流程再接真实 AI 才是更稳的路线",
      briefConstraints: ["避免空话", "强调流程拆解"],
    });

    expect(result.outline[0]?.heading).toContain("MVP");
    expect(fetchSpy.mock.calls[0]?.[1]?.body).toEqual(
      expect.stringContaining("帮助读者理解 AI 产品从原型到真实接入的工程决策。")
    );
    expect(fetchSpy.mock.calls[0]?.[1]?.body).toEqual(
      expect.stringContaining("让读者意识到先跑通主流程再接真实 AI 才是更稳的路线")
    );
    const outlineRequestPayload = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body));
    const outlineUserMessage = outlineRequestPayload.messages.find(
      (message: { role: string; content: string }) => message.role === "user"
    )?.content;
    expect(outlineUserMessage).toContain('"targetOutlineId":"string"');
  });

  it("parses outline JSON when mimo adds explanatory text with extra braces", async () => {
    vi.stubEnv("AI_PROVIDER", "mimo");
    vi.stubEnv("MIMO_API_KEY", "test-key");
    vi.stubEnv("MIMO_BASE_URL", "https://token-plan-cn.xiaomimimo.com/v1");
    vi.stubEnv("MIMO_MODEL", "mimo-v2.5-pro");

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  '说明：{以下内容为结构化返回}\n{"outline":[{"id":"section-1","heading":"为什么先跑通 MVP 主流程","notes":"先界定用户路径和验证目标。"}],"materialSlots":[{"id":"slot-1","targetOutlineId":"section-1","label":"案例证据","content":"补一个真实开发迭代片段。"}]}\n请查收。',
                role: "assistant",
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const result = await generateOutline({
      topicId: "topic-1",
      topicLabel: "工程推进视角",
      topicAngle: "从 MVP 到真实 AI 接入的工程推进",
      coreViewpoint: "先跑通主流程，再接真实 AI，才是更稳的工程顺序。",
      targetAudience: "产品经理和 AI 应用开发者",
      reason: "这个切口兼顾工程真实感和可复用方法论，适合做深度复盘。",
      structureType: "痛点拆解型",
      briefObjective: "帮助读者理解 AI 产品从原型到真实接入的工程决策。",
      briefAudience: "产品经理和 AI 应用开发者",
      briefTone: "清晰、务实、具体",
      briefConstraints: ["避免空话", "强调流程拆解"],
    });

    expect(result.outline).toHaveLength(1);
    expect(result.materialSlots).toHaveLength(1);
  });

  it("parses outline JSON when mimo prepends a smaller valid JSON object before the real payload", async () => {
    vi.stubEnv("AI_PROVIDER", "mimo");
    vi.stubEnv("MIMO_API_KEY", "test-key");
    vi.stubEnv("MIMO_BASE_URL", "https://token-plan-cn.xiaomimimo.com/v1");
    vi.stubEnv("MIMO_MODEL", "mimo-v2.5-pro");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  '{"note":"以下是结构化结果"}\n{"outline":[{"id":"section-1","heading":"为什么先跑通 MVP 主流程","notes":"先界定用户路径和验证目标。"}],"materialSlots":[{"id":"slot-1","targetOutlineId":"section-1","label":"案例证据","content":"补一个真实开发迭代片段。"}]}',
                role: "assistant",
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const result = await generateOutline({
      topicId: "topic-1",
      topicLabel: "工程推进视角",
      topicAngle: "从 MVP 到真实 AI 接入的工程推进",
      coreViewpoint: "先跑通主流程，再接真实 AI，才是更稳的工程顺序。",
      targetAudience: "产品经理和 AI 应用开发者",
      reason: "这个切口兼顾工程真实感和可复用方法论，适合做深度复盘。",
      briefObjective: "帮助读者理解 AI 产品从原型到真实接入的工程决策。",
      briefAudience: "产品经理和 AI 应用开发者",
      briefPersona: "一个踩过坑、讲真话的实战派产品负责人",
      briefTone: "清晰、务实、具体",
      briefDropOffPoint: "让读者意识到先跑通主流程再接真实 AI 才是更稳的路线",
      briefConstraints: ["避免空话", "强调流程拆解"],
      structureType: "痛点拆解型",
    });

    expect(result.outline).toHaveLength(1);
    expect(result.materialSlots).toHaveLength(1);
  });

  it("normalizes single-section outline payload without needing a retry", async () => {
    vi.stubEnv("AI_PROVIDER", "mimo");
    vi.stubEnv("MIMO_API_KEY", "test-key");
    vi.stubEnv("MIMO_BASE_URL", "https://token-plan-cn.xiaomimimo.com/v1");
    vi.stubEnv("MIMO_MODEL", "mimo-v2.5-pro");

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content:
                    '{"id":"1","heading":"引言：当AI有了行为准则","notes":"这是被截断后残留的单个段落对象。"}',
                  role: "assistant",
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    outline: [
                      {
                        id: "section-1",
                        heading: "为什么先跑通 MVP 主流程",
                        notes: "先界定用户路径和验证目标。",
                      },
                    ],
                    materialSlots: [
                      {
                        id: "slot-1",
                        targetOutlineId: "section-1",
                        label: "案例证据",
                        content: "补一个真实开发迭代片段。",
                      },
                    ],
                  }),
                  role: "assistant",
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    drafts: [
                      {
                        id: "draft-a",
                        label: "版本 A",
                        content: "正文吸收了第一步卡点。",
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

    const result = await generateOutline({
      topicId: "topic-1",
      topicLabel: "工程推进视角",
      topicAngle: "从 MVP 到真实 AI 接入的工程推进",
      coreViewpoint: "先跑通主流程，再接真实 AI，才是更稳的工程顺序。",
      targetAudience: "产品经理和 AI 应用开发者",
      reason: "这个切口兼顾工程真实感和可复用方法论，适合做深度复盘。",
      briefObjective: "帮助读者理解 AI 产品从原型到真实接入的工程决策。",
      briefAudience: "产品经理和 AI 应用开发者",
      briefTone: "清晰、务实、具体",
      briefConstraints: ["避免空话", "强调流程拆解"],
    });

    expect(result.outline).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("normalizes outline payload when mimo returns sections/slots aliases", async () => {
    vi.stubEnv("AI_PROVIDER", "mimo");
    vi.stubEnv("MIMO_API_KEY", "test-key");
    vi.stubEnv("MIMO_BASE_URL", "https://token-plan-cn.xiaomimimo.com/v1");
    vi.stubEnv("MIMO_MODEL", "mimo-v2.5-pro");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  sections: [
                    {
                      id: "section-1",
                      heading: "为什么先跑通 MVP 主流程",
                      notes: "先界定用户路径和验证目标。",
                    },
                  ],
                  slots: [
                    {
                      id: "slot-1",
                      targetOutlineId: "section-1",
                      label: "案例证据",
                      content: "补一个真实开发迭代片段。",
                    },
                  ],
                }),
                role: "assistant",
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const result = await generateOutline({
      topicId: "topic-1",
      topicLabel: "工程推进视角",
      topicAngle: "从 MVP 到真实 AI 接入的工程推进",
      coreViewpoint: "先跑通主流程，再接真实 AI，才是更稳的工程顺序。",
      targetAudience: "产品经理和 AI 应用开发者",
      reason: "这个切口兼顾工程真实感和可复用方法论，适合做深度复盘。",
      briefObjective: "帮助读者理解 AI 产品从原型到真实接入的工程决策。",
      briefAudience: "产品经理和 AI 应用开发者",
      briefPersona: "一个踩过坑、讲真话的实战派产品负责人",
      briefTone: "清晰、务实、具体",
      briefDropOffPoint: "让读者意识到先跑通主流程再接真实 AI 才是更稳的路线",
      briefConstraints: ["避免空话", "强调流程拆解"],
      structureType: "痛点拆解型",
    });

    expect(result.outline).toHaveLength(1);
    expect(result.materialSlots).toHaveLength(1);
  });

  it("normalizes outline payload when mimo returns single objects instead of arrays", async () => {
    vi.stubEnv("AI_PROVIDER", "mimo");
    vi.stubEnv("MIMO_API_KEY", "test-key");
    vi.stubEnv("MIMO_BASE_URL", "https://token-plan-cn.xiaomimimo.com/v1");
    vi.stubEnv("MIMO_MODEL", "mimo-v2.5-pro");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  outline: {
                    id: "section-1",
                    heading: "为什么先跑通 MVP 主流程",
                    notes: "先界定用户路径和验证目标。",
                  },
                  materialSlots: {
                    id: "slot-1",
                    targetOutlineId: "section-1",
                    label: "案例证据",
                    content: "补一个真实开发迭代片段。",
                  },
                }),
                role: "assistant",
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const result = await generateOutline({
      topicId: "topic-1",
      topicLabel: "工程推进视角",
      topicAngle: "从 MVP 到真实 AI 接入的工程推进",
      coreViewpoint: "先跑通主流程，再接真实 AI，才是更稳的工程顺序。",
      targetAudience: "产品经理和 AI 应用开发者",
      reason: "这个切口兼顾工程真实感和可复用方法论，适合做深度复盘。",
      briefObjective: "帮助读者理解 AI 产品从原型到真实接入的工程决策。",
      briefAudience: "产品经理和 AI 应用开发者",
      briefPersona: "一个踩过坑、讲真话的实战派产品负责人",
      briefTone: "清晰、务实、具体",
      briefDropOffPoint: "让读者意识到先跑通主流程再接真实 AI 才是更稳的路线",
      briefConstraints: ["避免空话", "强调流程拆解"],
      structureType: "痛点拆解型",
    });

    expect(result.outline).toHaveLength(1);
    expect(result.materialSlots).toHaveLength(1);
  });

  it("requests draft from mimo using topic, brief, outline, and material context", async () => {
    vi.stubEnv("AI_PROVIDER", "mimo");
    vi.stubEnv("MIMO_API_KEY", "test-key");
    vi.stubEnv("MIMO_BASE_URL", "https://token-plan-cn.xiaomimimo.com/v1");
    vi.stubEnv("MIMO_MODEL", "mimo-v2.5-pro");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  drafts: [
                    {
                      id: "draft-a",
                      label: "版本 A",
                      content: "先讲清 MVP 主流程为什么比一开始追求完美模型更重要。",
                    },
                    {
                      id: "draft-b",
                      label: "版本 B",
                      content: "把 provider 分层当成工程缓冲带，产品会更稳。",
                    },
                  ],
                }),
                role: "assistant",
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const result = await generateDraft({
      topicId: "topic-1",
      topicLabel: "工程推进视角",
      topicAngle: "从 MVP 到真实 AI 接入的工程推进",
      coreViewpoint: "先跑通主流程，再接真实 AI，才是更稳的工程顺序。",
      targetAudience: "产品经理和 AI 应用开发者",
      reason: "这个切口兼顾工程真实感和可复用方法论，适合做深度复盘。",
      structureType: "痛点拆解型",
      briefObjective: "帮助读者理解 AI 产品从原型到真实接入的工程决策。",
      briefAudience: "产品经理和 AI 应用开发者",
      briefPersona: "一个踩过坑、讲真话的实战派产品负责人",
      briefTone: "清晰、务实、具体",
      briefDropOffPoint: "让读者意识到先跑通主流程再接真实 AI 才是更稳的路线",
      briefConstraints: ["避免空话", "强调流程拆解"],
      outline: [
        {
          id: "section-1",
          heading: "为什么先跑通 MVP 主流程",
          notes: "先界定用户路径和验证目标。",
        },
      ],
      materialSlots: [
        {
          id: "slot-1",
          targetOutlineId: "section-1",
          label: "案例证据",
          content: "补一个真实开发迭代片段。",
        },
      ],
    });

    expect(result.drafts).toHaveLength(2);
    expect(fetchSpy.mock.calls[0]?.[1]?.body).toEqual(
      expect.stringContaining("为什么先跑通 MVP 主流程")
    );
  });

  it("returns the original draft without automatically running the humanizer", async () => {
    vi.stubEnv("AI_PROVIDER", "mimo");
    vi.stubEnv("MIMO_API_KEY", "test-key");
    vi.stubEnv("MIMO_BASE_URL", "https://token-plan-cn.xiaomimimo.com/v1");
    vi.stubEnv("MIMO_MODEL", "mimo-v2.5-pro");

    const placeholder = "【💡需要你补充：补一个真实开发片段】";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    drafts: [
                      {
                        id: "draft-a",
                        label: "原始版",
                        content: `首先，这不仅是流程问题，更是认知升级。${placeholder}`,
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

    const result = await generateDraft({
      topicId: "topic-1",
      topicLabel: "工程推进视角",
      topicAngle: "从 MVP 到真实 AI 接入的工程推进",
      coreViewpoint: "先跑通主流程，再接真实 AI。",
      targetAudience: "产品经理",
      reason: "这个切口可复用。",
      structureType: "痛点拆解型",
      briefObjective: "讲清工程顺序。",
      briefAudience: "产品经理",
      briefPersona: "踩过坑的产品负责人",
      briefTone: "清晰、务实",
      briefDropOffPoint: "让读者先验证主流程。",
      briefConstraints: ["避免空话"],
      outline: [
        {
          id: "section-1",
          heading: "为什么先跑通主流程",
          notes: "讲清工程顺序。",
        },
      ],
      materialSlots: [],
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.drafts).toHaveLength(1);
    expect(result.drafts[0]?.label).toBe("原始版");
    expect(result.drafts[0]?.content).toBe(
      `首先，这不仅是流程问题，更是认知升级。${placeholder}`
    );
  });

  it("humanizes a delivered draft in a separate service call", async () => {
    vi.stubEnv("AI_PROVIDER", "mimo");
    vi.stubEnv("MIMO_API_KEY", "test-key");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  drafts: [{ id: "draft-a", label: "原始版", content: "这事没那么玄。" }],
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await humanizeDraft({
      draft: {
        id: "draft-a",
        label: "原始版",
        content: "首先，这不仅是流程问题，更是认知升级。",
      },
      coreViewpoint: "先验证再优化。",
      briefPersona: "实战派负责人",
      briefTone: "务实",
      briefDropOffPoint: "先行动。",
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0]?.[1]?.body)).toContain("终审编辑");
    expect(result.draft).toEqual({
      id: "draft-a-humanized",
      label: "去 AI 版",
      content: "这事没那么玄。",
    });
  });

  it("throws when the separate humanizer request fails", async () => {
    vi.stubEnv("AI_PROVIDER", "mimo");
    vi.stubEnv("MIMO_API_KEY", "test-key");

    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("humanizer unavailable")
    );

    await expect(humanizeDraft({
      draft: { id: "draft-a", label: "原始版", content: "原始正文。" },
      coreViewpoint: "先验证再优化。",
      briefPersona: "实战派负责人",
      briefTone: "务实",
      briefDropOffPoint: "先行动。",
    })).rejects.toThrow("humanizer unavailable");
  });

  it("rejects a humanized draft that changes a material placeholder", async () => {
    vi.stubEnv("AI_PROVIDER", "mimo");
    vi.stubEnv("MIMO_API_KEY", "test-key");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    drafts: [
                      {
                        id: "draft-a",
                        label: "原始版",
                        content: "正文。【💡需要你补充：一个案例】",
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

    await expect(humanizeDraft({
      draft: {
        id: "draft-a",
        label: "原始版",
        content: "正文。【💡需要你补充：真实客户案例】",
      },
      coreViewpoint: "先验证再优化。",
      briefPersona: "实战派负责人",
      briefTone: "务实",
      briefDropOffPoint: "先行动。",
    })).rejects.toThrow(/素材占位符/);
  });

  it("summarizes deep-dive search benchmarks before requesting a draft from mimo", async () => {
    vi.stubEnv("AI_PROVIDER", "mimo");
    vi.stubEnv("MIMO_API_KEY", "test-key");
    vi.stubEnv("MIMO_BASE_URL", "https://token-plan-cn.xiaomimimo.com/v1");
    vi.stubEnv("MIMO_MODEL", "mimo-v2.5-pro");

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    summaries: [
                      {
                        url: "https://mp.weixin.qq.com/s/deep",
                        userPain: "读者真正卡住的是不知道第一步该做什么。",
                        structurePattern: "先讲失败场景，再拆误区，最后给最小行动。",
                        rhythmNotes: "短段密集，判断句靠前。",
                        commentInsights: ["评论区都在问怎么开始"],
                        reusableAngles: ["从第7天放弃切入"],
                        avoidCopying: ["不要照搬作者经历"],
                      },
                    ],
                  }),
                  role: "assistant",
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    drafts: [
                      {
                        id: "draft-a",
                        label: "版本 A",
                        content: "正文吸收了第一步卡点。",
                      },
                    ],
                  }),
                  role: "assistant",
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    drafts: [
                      {
                        id: "draft-a",
                        label: "版本 A",
                        content: "正文吸收了第一步卡点。",
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

    const result = await generateDraft({
      topicId: "topic-1",
      topicLabel: "AI 副业",
      topicAngle: "普通人为什么做不起来",
      coreViewpoint: "真正卡住的不是工具。",
      targetAudience: "AI 副业新手",
      reason: "有真实痛点。",
      structureType: "痛点拆解型",
      briefObjective: "讲清楚新手的真实卡点。",
      briefAudience: "AI 副业新手",
      briefPersona: "踩过坑的实战派前辈",
      briefTone: "真诚、具体",
      briefDropOffPoint: "让读者先做一个最小场景。",
      briefConstraints: ["避免空话"],
      outline: [
        {
          id: "section-1",
          heading: "为什么第7天就放弃",
          notes: "讲清楚第一步卡点。",
        },
      ],
      materialSlots: [],
      searchEnabled: true,
      searchContext: {
        status: "success",
        query: "AI 副业 痛点",
        intent: "topics",
        freshness: "pastMonth",
        seoKeywords: [],
        crowdedness: "medium",
        staleBuzzwords: [],
        notes: [],
        results: [
          {
            title: "普通人用 AI 做副业，为什么第7天就放弃",
            snippet: "真实复盘。",
            url: "https://mp.weixin.qq.com/s/deep",
            source: "wechat",
            articleHtml: "<p>很多人不是不会用工具。</p><p><strong>真正卡住的是第一步。</strong></p>",
            comments: [
              { content: "我也不知道第一步怎么开始", likeCount: 90 },
            ],
          },
        ],
      },
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(String(fetchSpy.mock.calls[0]?.[1]?.body)).toContain("对标拆解总结");
    expect(String(fetchSpy.mock.calls[1]?.[1]?.body)).toContain(
      "读者真正卡住的是不知道第一步该做什么。"
    );
    expect(result.searchContext?.results[0]?.benchmarkSummary?.userPain).toBe(
      "读者真正卡住的是不知道第一步该做什么。"
    );
  });

  it("parses draft JSON when mimo wraps the payload with explanatory text", async () => {
    vi.stubEnv("AI_PROVIDER", "mimo");
    vi.stubEnv("MIMO_API_KEY", "test-key");
    vi.stubEnv("MIMO_BASE_URL", "https://token-plan-cn.xiaomimimo.com/v1");
    vi.stubEnv("MIMO_MODEL", "mimo-v2.5-pro");

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content:
                    '下面是按要求返回的 JSON：\n{"drafts":[{"id":"draft-a","label":"版本 A","content":"先讲清主流程。"},{"id":"draft-b","label":"版本 B","content":"再讲 provider 分层。"}]}\n请查收。',
                  role: "assistant",
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    drafts: [
                      {
                        id: "draft-a",
                        label: "版本 A",
                        content: "先讲清主流程。",
                      },
                      {
                        id: "draft-b",
                        label: "版本 B",
                        content: "再讲 provider 分层。",
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

    const result = await generateDraft({
      topicId: "topic-1",
      topicLabel: "工程推进视角",
      topicAngle: "从 MVP 到真实 AI 接入的工程推进",
      coreViewpoint: "先跑通主流程，再接真实 AI，才是更稳的工程顺序。",
      targetAudience: "产品经理和 AI 应用开发者",
      reason: "这个切口兼顾工程真实感和可复用方法论，适合做深度复盘。",
      structureType: "痛点拆解型",
      briefObjective: "帮助读者理解 AI 产品从原型到真实接入的工程决策。",
      briefAudience: "产品经理和 AI 应用开发者",
      briefPersona: "一个踩过坑、讲真话的实战派产品负责人",
      briefTone: "清晰、务实、具体",
      briefDropOffPoint: "让读者意识到先跑通主流程再接真实 AI 才是更稳的路线",
      briefConstraints: ["避免空话", "强调流程拆解"],
      outline: [
        {
          id: "section-1",
          heading: "为什么先跑通 MVP 主流程",
          notes: "先界定用户路径和验证目标。",
        },
      ],
      materialSlots: [
        {
          id: "slot-1",
          targetOutlineId: "section-1",
          label: "案例证据",
          content: "补一个真实开发迭代片段。",
        },
      ],
    });

    expect(result.drafts).toHaveLength(2);
    expect(result.drafts[0]?.content).toContain("主流程");
  });

  it("retries mimo draft when the first network call fails", async () => {
    vi.stubEnv("AI_PROVIDER", "mimo");
    vi.stubEnv("MIMO_API_KEY", "test-key");
    vi.stubEnv("MIMO_BASE_URL", "https://token-plan-cn.xiaomimimo.com/v1");
    vi.stubEnv("MIMO_MODEL", "mimo-v2.5-pro");

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("fetch failed"))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    drafts: [
                      {
                        id: "draft-a",
                        label: "版本 A",
                        content: "先讲清主流程。",
                      },
                    ],
                  }),
                  role: "assistant",
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    drafts: [
                      {
                        id: "draft-a",
                        label: "版本 A",
                        content: "先讲清主流程。",
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

    const result = await generateDraft({
      topicId: "topic-1",
      topicLabel: "工程推进视角",
      topicAngle: "从 MVP 到真实 AI 接入的工程推进",
      coreViewpoint: "先跑通主流程，再接真实 AI，才是更稳的工程顺序。",
      targetAudience: "产品经理和 AI 应用开发者",
      reason: "这个切口兼顾工程真实感和可复用方法论，适合做深度复盘。",
      structureType: "痛点拆解型",
      briefObjective: "帮助读者理解 AI 产品从原型到真实接入的工程决策。",
      briefAudience: "产品经理和 AI 应用开发者",
      briefPersona: "一个踩过坑、讲真话的实战派产品负责人",
      briefTone: "清晰、务实、具体",
      briefDropOffPoint: "让读者意识到先跑通主流程再接真实 AI 才是更稳的路线",
      briefConstraints: ["避免空话", "强调流程拆解"],
      outline: [
        {
          id: "section-1",
          heading: "为什么先跑通 MVP 主流程",
          notes: "先界定用户路径和验证目标。",
        },
      ],
      materialSlots: [
        {
          id: "slot-1",
          targetOutlineId: "section-1",
          label: "案例证据",
          content: "补一个真实开发迭代片段。",
        },
      ],
    });

    expect(result.drafts).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("normalizes a wrong draft JSON shape without requiring a retry", async () => {
    vi.stubEnv("AI_PROVIDER", "mimo");
    vi.stubEnv("MIMO_API_KEY", "test-key");
    vi.stubEnv("MIMO_BASE_URL", "https://token-plan-cn.xiaomimimo.com/v1");
    vi.stubEnv("MIMO_MODEL", "mimo-v2.5-pro");

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content:
                    '{"id":"draft_1","label":"深度技术评测风格","content":"这是被截断后残留的单个正文对象。"}',
                  role: "assistant",
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content:
                    '{"drafts":[{"id":"draft_1","label":"深度技术评测风格","content":"这是被截断后残留的单个正文对象。"}]}',
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

    const result = await generateDraft({
      topicId: "topic-1",
      topicLabel: "工程推进视角",
      topicAngle: "从 MVP 到真实 AI 接入的工程推进",
      coreViewpoint: "先跑通主流程，再接真实 AI，才是更稳的工程顺序。",
      targetAudience: "产品经理和 AI 应用开发者",
      reason: "这个切口兼顾工程真实感和可复用方法论，适合做深度复盘。",
      structureType: "痛点拆解型",
      briefObjective: "帮助读者理解 AI 产品从原型到真实接入的工程决策。",
      briefAudience: "产品经理和 AI 应用开发者",
      briefPersona: "一个踩过坑、讲真话的实战派产品负责人",
      briefTone: "清晰、务实、具体",
      briefDropOffPoint: "让读者意识到先跑通主流程再接真实 AI 才是更稳的路线",
      briefConstraints: ["避免空话", "强调流程拆解"],
      outline: [
        {
          id: "section-1",
          heading: "为什么先跑通 MVP 主流程",
          notes: "先界定用户路径和验证目标。",
        },
      ],
      materialSlots: [
        {
          id: "slot-1",
          targetOutlineId: "section-1",
          label: "案例证据",
          content: "补一个真实开发迭代片段。",
        },
      ],
    });

    expect(result.drafts).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("normalizes a single draft object into the expected drafts array shape", async () => {
    vi.stubEnv("AI_PROVIDER", "mimo");
    vi.stubEnv("MIMO_API_KEY", "test-key");
    vi.stubEnv("MIMO_BASE_URL", "https://token-plan-cn.xiaomimimo.com/v1");
    vi.stubEnv("MIMO_MODEL", "mimo-v2.5-pro");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  id: "draft_1",
                  label: "技术深度评测版",
                  content: "这是被截断后残留的单个正文对象。",
                }),
                role: "assistant",
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const result = await generateDraft({
      topicId: "topic-1",
      topicLabel: "工程推进视角",
      topicAngle: "从 MVP 到真实 AI 接入的工程推进",
      coreViewpoint: "先跑通主流程，再接真实 AI，才是更稳的工程顺序。",
      targetAudience: "产品经理和 AI 应用开发者",
      reason: "这个切口兼顾工程真实感和可复用方法论，适合做深度复盘。",
      structureType: "痛点拆解型",
      briefObjective: "帮助读者理解 AI 产品从原型到真实接入的工程决策。",
      briefAudience: "产品经理和 AI 应用开发者",
      briefPersona: "一个踩过坑、讲真话的实战派产品负责人",
      briefTone: "清晰、务实、具体",
      briefDropOffPoint: "让读者意识到先跑通主流程再接真实 AI 才是更稳的路线",
      briefConstraints: ["避免空话", "强调流程拆解"],
      outline: [
        {
          id: "section-1",
          heading: "为什么先跑通 MVP 主流程",
          notes: "先界定用户路径和验证目标。",
        },
      ],
      materialSlots: [
        {
          id: "slot-1",
          targetOutlineId: "section-1",
          label: "案例证据",
          content: "补一个真实开发迭代片段。",
        },
      ],
    });

    expect(result.drafts).toHaveLength(1);
    expect(result.drafts[0]?.label).toBe("原始版");
    expect(result.drafts[0]?.content).toContain("单个正文对象");
  });

  it("requests meta from mimo using topic and selected draft content", async () => {
    vi.stubEnv("AI_PROVIDER", "mimo");
    vi.stubEnv("MIMO_API_KEY", "test-key");
    vi.stubEnv("MIMO_BASE_URL", "https://token-plan-cn.xiaomimimo.com/v1");
    vi.stubEnv("MIMO_MODEL", "mimo-v2.5-pro");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  titles: [
                    {
                      id: "title-1",
                      label: "利益结果型",
                      content: "先跑通主流程，再谈完美模型",
                    },
                    {
                      id: "title-2",
                      label: "场景痛点型",
                      content: "为什么你越堆功能，用户反而越感觉不到价值？",
                    },
                    {
                      id: "title-3",
                      label: "反常识/认知冲突型",
                      content: "你以为模型最重要，其实最该先做的是另一件事",
                    },
                    {
                      id: "title-4",
                      label: "新机会趋势型",
                      content: "真正的新机会，不在更强模型，而在更稳的工作流",
                    },
                    {
                      id: "title-5",
                      label: "个人故事/实录型",
                      content: "做完这一轮产品迭代，我才明白什么叫先跑通主流程",
                    },
                  ],
                  summaries: [
                    {
                      id: "summary-1",
                      label: "痛点共鸣版",
                      content: "这篇文章拆解 AI 写作产品从原型到真实接入的工程路径。",
                    },
                    {
                      id: "summary-2",
                      label: "悬念反转版",
                      content: "你以为问题出在模型，其实真正拖慢产品的是另一个决定。",
                    },
                    {
                      id: "summary-3",
                      label: "专业克制版",
                      content: "文章系统梳理了 AI 写作产品从 MVP 到真实接入的关键工程取舍。",
                    },
                  ],
                  coverSuggestion:
                    "封面优先用真实产品流程图或后台截图，避免空泛科技感插画。",
                }),
                role: "assistant",
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const result = await generateTitlesAndSummaries({
      topicLabel: "工程推进视角",
      coreViewpoint: "真正决定 AI 产品能不能落地的，不是模型有多强，而是流程设计有没有先跑通。",
      topicAngle: "从 MVP 到真实 AI 接入的工程推进",
      structureType: "痛点拆解型",
      briefObjective: "帮助读者理解 AI 产品从原型到真实接入的工程决策。",
      briefAudience: "产品经理和 AI 应用开发者",
      briefPersona: "一个踩过坑、讲真话的实战派产品负责人",
      briefDropOffPoint: "让读者意识到先跑通主流程再接真实 AI 才是更稳的路线",
      draftContent: "先讲清 MVP 主流程为什么比一开始追求完美模型更重要。",
    });

    expect(result.titles[0]?.content).toContain("主流程");
    expect(result.coverSuggestion).toContain("真实产品流程图");
    expect(fetchSpy.mock.calls[0]?.[1]?.body).toEqual(
      expect.stringContaining("工程推进视角")
    );
  });
});
