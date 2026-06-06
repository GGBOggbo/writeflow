import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppClient } from "./app-client";

describe("AppClient", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("moves from idea input to topic selection", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          topics: [
            {
              id: "topic-1",
              title: "选题一",
              label: "情绪共鸣视角",
              angle: "切入角度一",
              summary: "摘要一",
              coreViewpoint: "观点一",
              targetAudience: "读者一",
              reason: "原因一",
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    render(<AppClient />);

    await user.type(screen.getByLabelText(/核心想法/i), "AI 写作工作流");
    await user.click(screen.getByRole("button", { name: /生成选题方向/i }));

    expect(await screen.findByText(/选题会：选出最值得展开的切口/i)).toBeInTheDocument();
  });

  it("shows a generation timeline while a request is running", async () => {
    const user = userEvent.setup();
    let resolveRequest: (response: Response) => void = () => {};
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
    );

    render(<AppClient />);

    await user.type(screen.getByLabelText(/核心想法/i), "AI 写作工作流");
    await user.click(screen.getByRole("button", { name: /生成选题方向/i }));

    expect(await screen.findByText("生成导演台")).toBeInTheDocument();
    expect(screen.getByText("微信搜一搜")).toBeInTheDocument();
    expect(screen.getByText("5 篇互动验证")).toBeInTheDocument();

    resolveRequest(
      new Response(
        JSON.stringify({
          topics: [
            {
              id: "topic-1",
              title: "选题一",
              label: "情绪共鸣视角",
              angle: "切入角度一",
              summary: "摘要一",
              coreViewpoint: "观点一",
              targetAudience: "读者一",
              reason: "原因一",
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
  });

  it("shows brief confirmation after a topic is selected", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            topics: [
              {
                id: "topic-1",
                title: "选题一",
                label: "情绪共鸣视角",
                angle: "切入角度一",
                summary: "摘要一",
                coreViewpoint: "观点一",
                targetAudience: "读者一",
                reason: "原因一",
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
            brief: {
              objective: "写出一篇完整草稿",
              audience: "内容创作者",
              persona: "实战派前辈",
              tone: "冷静具体",
              dropOffPoint: "让读者开始行动",
              constraints: ["避免空话"],
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

    render(<AppClient />);

    await user.type(screen.getByLabelText(/核心想法/i), "AI 写作工作流");
    await user.click(screen.getByRole("button", { name: /生成选题方向/i }));
    const topicButtons = await screen.findAllByRole("button", { name: /选择 /i });
    await user.click(topicButtons[0]);

    expect(
      await screen.findByRole("heading", { name: /把策略单定稳/i })
    ).toBeInTheDocument();
  });

  it("automatically reuses topic search context for brief generation without an extra toggle", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            topics: [
              {
                id: "topic-1",
                title: "选题一",
                label: "情绪共鸣视角",
                angle: "切入角度一",
                summary: "摘要一",
                coreViewpoint: "观点一",
                targetAudience: "读者一",
                reason: "原因一",
              },
            ],
            searchContext: {
              status: "success",
              query: "AI 写作 痛点",
              intent: "topics",
              freshness: "pastMonth",
              results: [
                {
                  title: "参考文章",
                  snippet: "参考摘要",
                  url: "https://mp.weixin.qq.com/s/example",
                  source: "wechat",
                },
              ],
              seoKeywords: ["AI 写作"],
              crowdedness: "low",
              staleBuzzwords: [],
              notes: [],
            },
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
            brief: {
              objective: "写出一篇完整草稿",
              audience: "内容创作者",
              persona: "实战派前辈",
              tone: "冷静具体",
              dropOffPoint: "让读者开始行动",
              constraints: ["避免空话"],
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

    render(<AppClient />);

    await user.type(screen.getByLabelText(/核心想法/i), "AI 写作工作流");
    await user.click(screen.getByRole("button", { name: /生成选题方向/i }));
    await user.click((await screen.findAllByRole("button", { name: /选择 /i }))[0]);

    const briefRequest = fetchSpy.mock.calls.find(
      ([url]) => url === "/api/ai/brief/stream"
    );
    const briefPayload = JSON.parse(String(briefRequest?.[1]?.body));

    expect(briefPayload.searchEnabled).toBe(true);
    expect(briefPayload.searchContext.results[0].url).toBe(
      "https://mp.weixin.qq.com/s/example"
    );
    expect(screen.queryByText("复用选题参考")).not.toBeInTheDocument();
  });

  it("uses the selected structure type when generating the outline", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            topics: [
              {
                id: "topic-1",
                title: "选题一",
                label: "情绪共鸣视角",
                angle: "切入角度一",
                summary: "摘要一",
                coreViewpoint: "观点一",
                targetAudience: "读者一",
                reason: "原因一",
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
            brief: {
              objective: "写出一篇完整草稿",
              audience: "内容创作者",
              persona: "实战派前辈",
              tone: "冷静具体",
              dropOffPoint: "让读者开始行动",
              constraints: ["避免空话"],
            },
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
            outline: [
              {
                id: "section-1",
                heading: "开头",
                corePoint: "核心判断",
                supportSuggestion: "补一个真实案例",
                sectionRole: "痛点引入",
              },
            ],
            materialSlots: [],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

    render(<AppClient />);

    await user.type(screen.getByLabelText(/核心想法/i), "AI 写作工作流");
    await user.click(screen.getByRole("button", { name: /生成选题方向/i }));
    await user.click((await screen.findAllByRole("button", { name: /选择 /i }))[0]);
    await screen.findByRole("heading", { name: /把策略单定稳/i });

    await user.selectOptions(
      screen.getByLabelText(/文章结构类型/i),
      "故事案例型"
    );
    await user.click(screen.getByRole("button", { name: /确认提纲/i }));

    expect(await screen.findByRole("heading", { name: /结构审稿：先看骨架，再看素材/i })).toBeInTheDocument();

    const outlineRequest = fetchSpy.mock.calls.find(
      ([url]) => url === "/api/ai/outline/stream"
    );

    expect(outlineRequest).toBeDefined();
    expect(JSON.parse(String(outlineRequest?.[1]?.body)).structureType).toBe(
      "故事案例型"
    );
  });

  it("shows a visible brief-loading placeholder immediately after topic selection", async () => {
    const user = userEvent.setup();
    let resolveBrief: ((value: Response) => void) | null = null;

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            topics: [
              {
                id: "topic-1",
                title: "选题一",
                label: "情绪共鸣视角",
                angle: "切入角度一",
                summary: "摘要一",
                coreViewpoint: "观点一",
                targetAudience: "读者一",
                reason: "原因一",
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveBrief = resolve;
          })
      );

    render(<AppClient />);

    await user.type(screen.getByLabelText(/核心想法/i), "AI 写作工作流");
    await user.click(screen.getByRole("button", { name: /生成选题方向/i }));
    await user.click((await screen.findAllByRole("button", { name: /选择 /i }))[0]);

    expect(await screen.findByText(/正在根据这个选题生成写作提纲/i)).toBeInTheDocument();

    resolveBrief?.(
      new Response(
        JSON.stringify({
          brief: {
            objective: "写出一篇完整草稿",
            audience: "内容创作者",
            persona: "实战派前辈",
            tone: "冷静具体",
            dropOffPoint: "让读者开始行动",
            constraints: ["避免空话"],
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
  });

  it("shows the API error message when topic generation fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: "OPENAI_API_KEY 未配置，无法使用 openai provider。",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    render(<AppClient />);

    await user.type(screen.getByLabelText(/核心想法/i), "AI 写作工作流");
    await user.click(screen.getByRole("button", { name: /生成选题方向/i }));

    const errorMessages = await screen.findAllByText(
      /OPENAI_API_KEY 未配置，无法使用 openai provider。/i
    );

    expect(errorMessages.length).toBeGreaterThan(0);
  });

  it("allows retrying the failed topic generation from the error notice", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: "临时网络错误",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            topics: [
              {
                id: "topic-1",
                title: "重试后的选题",
                label: "重试视角",
                angle: "重试角度",
                summary: "重试摘要",
                coreViewpoint: "重试观点",
                targetAudience: "重试读者",
                reason: "重试原因",
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

    render(<AppClient />);

    await user.type(screen.getByLabelText(/核心想法/i), "AI 写作工作流");
    await user.click(screen.getByRole("button", { name: /生成选题方向/i }));
    expect(await screen.findAllByText(/临时网络错误/i)).not.toHaveLength(0);

    await user.click(screen.getByRole("button", { name: /重试当前步骤/i }));

    expect(await screen.findByText(/重试后的选题/i)).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("shows a non-blocking degraded-search message while still rendering topic results", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          topics: [
              {
                id: "topic-1",
                title: "选题一",
                label: "情绪共鸣视角",
                angle: "切入角度一",
                summary: "摘要一",
                coreViewpoint: "观点一",
                targetAudience: "读者一",
                reason: "原因一",
              },
          ],
          searchStatus: "degraded",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    render(<AppClient />);

    await user.type(screen.getByLabelText(/核心想法/i), "AI 写作工作流");
    await user.click(screen.getByRole("button", { name: /生成选题方向/i }));

    expect(await screen.findByText(/选题会：选出最值得展开的切口/i)).toBeInTheDocument();
    expect(
      await screen.findAllByText(/联网增强暂不可用，本次生成已自动降级为基础模式。/i)
    ).not.toHaveLength(0);
  });

  it("asks for confirmation before resetting the workflow", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "ai-writing-mvp-workflow",
      JSON.stringify({
        currentStep: "finalize",
        ideaInput: "旧的文章想法",
        topicOptions: [],
        selectedTopicId: null,
        brief: null,
        outline: [],
        materialSlots: [],
        draftVersions: [],
        selectedDraftVersionId: null,
        titleOptions: [],
        summaryOptions: [],
        finalSelection: {
          draftVersionId: null,
          titleId: null,
          summaryId: null,
        },
      })
    );

    render(<AppClient />);

    await user.click(await screen.findByRole("button", { name: /开启新稿/i }));

    expect(screen.getByLabelText(/核心想法/i)).toHaveValue("旧的文章想法");
    expect(
      screen.getByRole("button", { name: /确认清空当前稿件/i })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /确认清空当前稿件/i }));

    expect(
      await screen.findByRole("heading", { name: /先把命题说清楚/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/核心想法/i)).toHaveValue("");
  });

  it("ignores stale topic results after resetting during an in-flight request", async () => {
    const user = userEvent.setup();
    let resolveTopics: ((value: Response) => void) | null = null;

    vi.spyOn(globalThis, "fetch").mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveTopics = resolve;
        })
    );

    render(<AppClient />);

    await user.type(screen.getByLabelText(/核心想法/i), "AI 写作工作流");
    await user.click(screen.getByRole("button", { name: /生成选题方向/i }));
    await user.click(screen.getByRole("button", { name: /开启新稿/i }));
    await user.click(screen.getByRole("button", { name: /确认清空当前稿件/i }));

    resolveTopics?.(
      new Response(
        JSON.stringify({
          topics: [
            {
              id: "topic-1",
              title: "过期选题",
              label: "过期视角",
              angle: "过期角度",
              summary: "过期摘要",
              coreViewpoint: "过期观点",
              targetAudience: "过期读者",
              reason: "过期原因",
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    expect(
      await screen.findByRole("heading", { name: /先把命题说清楚/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /选题会：选出最值得展开的切口/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/核心想法/i)).toHaveValue("");
  });
});
