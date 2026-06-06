import { afterEach, describe, expect, it, vi } from "vitest";
import { jizhilaSearchProvider } from "./jizhila-provider";

describe("jizhila search provider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("calls web_search and normalizes WeChat article results", async () => {
    vi.stubEnv("JIZHILA_API_KEY", "test-key");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          code: 0,
          cost_money: 0.5,
          remain_money: 88.8,
          data: [
            {
              items: [
                {
                  title:
                    '普通人用<em class="highlight">AI</em>编程做副业',
                  desc:
                    '<em class="highlight">AI</em>编程与轻量工具开发是上限比较高的方向。',
                  doc_url: "https://mp.weixin.qq.com/s/example",
                  source: {
                    title: "AI时代引路人",
                  },
                  timestamp: 1780574904,
                },
              ],
            },
          ],
        }),
        { status: 200 }
      )
    );

    const results = await jizhilaSearchProvider.search({
      query: "AI 编程 副业",
      intent: "topics",
      mode: "default",
      freshness: "pastMonth",
      sortType: "hot",
    });

    expect(results).toEqual([
      {
        title: "普通人用AI编程做副业",
        snippet: "AI编程与轻量工具开发是上限比较高的方向。",
        url: "https://mp.weixin.qq.com/s/example",
        publishedAt: "2026-06-04T12:08:24.000Z",
        source: "wechat",
        notes: ["公众号：AI时代引路人"],
      },
    ]);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://www.dajiala.com/fbmain/monitor/v3/web_search",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
    );
    expect(JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body))).toMatchObject({
      mode: 1,
      keyword: "AI 编程 副业",
      search_type: 1,
      publish_time_type: 2,
      sort_type: 2,
      currentPage: 1,
      offset: 0,
      cookies_buffer: "",
      key: "test-key",
      verifycode: "",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("enriches search results with read_zan_pro metrics when enabled", async () => {
    vi.stubEnv("JIZHILA_API_KEY", "test-key");
    vi.stubEnv("JIZHILA_ENRICH_READ_ZAN", "true");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 0,
            data: [
              {
                items: [
                  {
                    title: "高互动公众号文章",
                    desc: "这是一篇可用于对标的文章。",
                    doc_url: "https://mp.weixin.qq.com/s/high",
                    timestamp: 1780574904,
                  },
                ],
              },
            ],
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 0,
            msg: "success",
            data: {
              read: 100001,
              zan: 6631,
              looking: 2706,
              share_num: 10,
              collect_num: 128,
              comment_count: 16,
            },
          }),
          { status: 200 }
        )
      );

    const results = await jizhilaSearchProvider.search({
      query: "AI 编程 副业",
      intent: "topics",
      mode: "default",
      freshness: "pastMonth",
      sortType: "hot",
    });

    expect(results[0]?.engagementMetrics).toEqual({
      readCount: 100001,
      likeCount: 6631,
      lookingCount: 2706,
      shareCount: 10,
      collectCount: 128,
      commentCount: 16,
    });
    expect(fetchSpy).toHaveBeenLastCalledWith(
      "https://www.dajiala.com/fbmain/monitor/v3/read_zan_pro",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("https://mp.weixin.qq.com/s/high"),
      })
    );
  });

  it("deep-dives selected articles with html and comments when enabled", async () => {
    vi.stubEnv("JIZHILA_API_KEY", "test-key");
    vi.stubEnv("JIZHILA_ENRICH_READ_ZAN", "true");
    vi.stubEnv("JIZHILA_ENRICH_LIMIT", "5");
    vi.stubEnv("JIZHILA_ENRICH_ARTICLE_HTML", "true");
    vi.stubEnv("JIZHILA_ENRICH_ARTICLE_LIMIT", "2");
    vi.stubEnv("JIZHILA_ENRICH_COMMENTS", "true");
    vi.stubEnv("JIZHILA_ENRICH_COMMENT_LIMIT", "2");
    vi.stubEnv("JIZHILA_ENRICH_COMMENT_TOP_N", "2");

    const searchItems = [
      ["人民日报重磅发布行业趋势白皮书", "https://mp.weixin.qq.com/s/official"],
      ["n8n 史诗级更新：普通人做 AI 工作流的新机会来了", "https://mp.weixin.qq.com/s/trend"],
      ["普通人用 AI 做副业，为什么第7天就放弃", "https://mp.weixin.qq.com/s/small"],
      ["新手做公众号没人看，我复盘了这3个坑", "https://mp.weixin.qq.com/s/mid"],
      ["我用 n8n 自动化接单，踩坑后才明白这件事", "https://mp.weixin.qq.com/s/stable"],
      ["宝妈在家做内容，真正卡住的是没时间", "https://mp.weixin.qq.com/s/mom"],
      ["协会发布年度观察报告", "https://mp.weixin.qq.com/s/association"],
      ["小团队用 Claude 写代码的真实复盘", "https://mp.weixin.qq.com/s/claude"],
    ];

    const readByUrl: Record<string, unknown> = {
      "https://mp.weixin.qq.com/s/trend": {
        read: 12000,
        zan: 720,
        collect_num: 410,
        comment_count: 66,
      },
      "https://mp.weixin.qq.com/s/small": {
        read: 2000,
        zan: 160,
        collect_num: 96,
        comment_count: 32,
      },
      "https://mp.weixin.qq.com/s/mid": {
        read: 8000,
        zan: 520,
        collect_num: 260,
        comment_count: 48,
      },
      "https://mp.weixin.qq.com/s/stable": {
        read: 15000,
        zan: 900,
        collect_num: 500,
        comment_count: 70,
      },
      "https://mp.weixin.qq.com/s/mom": {
        read: 3000,
        zan: 120,
        collect_num: 90,
        comment_count: 12,
      },
    };

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (url, init) => {
        const endpoint = String(url);
        const body = JSON.parse(String(init?.body ?? "{}"));

        if (endpoint.endsWith("/web_search")) {
          return new Response(
            JSON.stringify({
              code: 0,
              data: [
                {
                  items: searchItems.map(([title, doc_url]) => ({
                    title,
                    desc: "普通人真实复盘，讲清楚具体场景和踩坑。",
                    doc_url,
                    source: { title: title.includes("人民日报") ? "人民日报" : "个人号" },
                    timestamp: 1780574904,
                  })),
                },
              ],
            }),
            { status: 200 }
          );
        }

        if (endpoint.endsWith("/read_zan_pro")) {
          return new Response(
            JSON.stringify({
              code: 0,
              data: readByUrl[body.url],
            }),
            { status: 200 }
          );
        }

        if (endpoint.endsWith("/article_html")) {
          return new Response(
            JSON.stringify({
              code: 0,
              data: {
                html: `<p>${body.url} 的正文</p>`,
              },
            }),
            { status: 200 }
          );
        }

        if (endpoint.endsWith("/article_comment2")) {
          return new Response(
            JSON.stringify({
              code: 0,
              data: [
                { content: "高赞评论1", like_num: 90, is_top: 1 },
                { content: "高赞评论2", like_num: 20, is_top: 0 },
                { content: "低赞评论", like_num: 1, is_top: 0 },
              ],
            }),
            { status: 200 }
          );
        }

        return new Response("not found", { status: 404 });
      });

    const results = await jizhilaSearchProvider.search({
      query: "AI 副业 痛点",
      intent: "topics",
      mode: "default",
      freshness: "pastMonth",
      sortType: "hot",
    });

    const calls = fetchSpy.mock.calls.map(([url, init]) => ({
      url: String(url),
      body: JSON.parse(String(init?.body ?? "{}")),
    }));
    expect(calls.filter((call) => call.url.endsWith("/read_zan_pro"))).toHaveLength(5);
    expect(calls.filter((call) => call.url.endsWith("/article_html"))).toHaveLength(2);
    expect(calls.filter((call) => call.url.endsWith("/article_comment2"))).toHaveLength(2);

    const deepDiveResults = results.filter((result) => result.articleHtml);
    expect(deepDiveResults.map((result) => result.url)).toEqual([
      "https://mp.weixin.qq.com/s/stable",
      "https://mp.weixin.qq.com/s/small",
    ]);
    expect(deepDiveResults[0]?.comments?.map((comment) => comment.content)).toEqual([
      "高赞评论1",
      "高赞评论2",
    ]);
  });
});
