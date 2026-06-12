import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildBriefSearchQuery,
  buildMetaSearchQuery,
  buildOutlineSearchQuery,
  buildTopicsSearchQuery,
  searchForBrief,
  searchForMeta,
  searchForOutline,
  searchForTopics,
} from "./service";

describe("search service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("builds a topic-oriented query", () => {
    const query = buildTopicsSearchQuery("如何把小红书做成可复用流程");
    expect(query).toContain("痛点");
    expect(query).toContain("小红书");
    expect(query).not.toContain("公众号");
    expect(query).not.toContain("最新");
  });

  it("extracts domain, audience, and pain terms from long topic ideas", () => {
    const query = buildTopicsSearchQuery(
      "我想写一篇给宝妈看的内容，她们每天带娃很累，没时间上班，但又想在家赚点零花钱，不想做微商，也不想去端盘子。"
    );

    expect(query).toContain("副业");
    expect(query).toContain("宝妈");
    expect(query).toContain("在家");
    expect(query).toContain("没时间");
    expect(query).toContain("痛点");
    expect(query).not.toContain("我想写");
    expect(query).not.toContain("一篇给宝妈看的内容");
  });

  it("keeps AI only when the topic idea is AI-related", () => {
    expect(
      buildTopicsSearchQuery("在长沙，为什么这么多奶茶店关门了")
    ).not.toContain("AI");

    const query = buildTopicsSearchQuery(
      "想写普通人用 AI 编程做副业，但不是教代码，而是讲为什么很多人学了一堆工具还是做不出能赚钱的小产品。"
    );

    expect(query).toContain("AI");
    expect(query).toContain("编程");
    expect(query).toContain("副业");
    expect(query).toContain("普通人");
    expect(query).toContain("赚钱");
  });

  it("builds a meta-oriented query", () => {
    const query = buildMetaSearchQuery("工程推进", "产品经理", "正文反复提到提示词调试和上下文压缩。");
    expect(query).toContain("痛点");
    expect(query).toContain("现状");
    expect(query).toContain("提示词调试");
    expect(query).not.toContain("爆款");
    expect(query).not.toContain("标题");
    expect(query).not.toContain("表达");
    expect(query.length).toBeLessThan(80);
  });

  it("builds a brief-oriented query", () => {
    const query = buildBriefSearchQuery("一人公司", "真实表达", "探讨一人公司的真实挑战");
    expect(query).toContain("一人公司");
    expect(query).toContain("人群");
    expect(query).toContain("痛点");
    expect(query).not.toContain("最新");
  });

  it("builds an outline-oriented query", () => {
    const query = buildOutlineSearchQuery("一人公司", "打破认知", "创业者");
    expect(query).toContain("一人公司");
    expect(query).toContain("结构");
    expect(query).toContain("大纲");
    expect(query).not.toContain("最新");
  });

  it("keeps search disabled without calling Bocha", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const bundle = await searchForTopics("AI 写作工作流", "default");

    expect(bundle.status).toBe("empty");
    expect(bundle.results).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps meta search disabled without calling Bocha", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const bundle = await searchForMeta("测试角度", "测试读者", "正文内容", "default");

    expect(bundle.status).toBe("empty");
    expect(bundle.results).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls Bocha only when SEARCH_PROVIDER=bocha", async () => {
    vi.stubEnv("SEARCH_PROVIDER", "bocha");
    vi.stubEnv("BOCHA_API_KEY", "test-key");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          code: 200,
          data: {
            _type: "SearchResponse",
            webPages: {
              value: [
                {
                  name: "测试文章",
                  url: "https://example.com/1",
                  snippet: "摘要内容",
                  summary: "摘要内容",
                  siteName: "微信公众号",
                },
              ],
            },
          },
        }),
        { status: 200 }
      )
    );

    const bundle = await searchForTopics("测试查询", "default");

    expect(bundle.status).toBe("success");
    expect(bundle.results[0]?.title).toBe("测试文章");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("calls Jizhila only when SEARCH_PROVIDER=jizhila", async () => {
    vi.stubEnv("SEARCH_PROVIDER", "jizhila");
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
                  title: "公众号文章",
                  desc: "公众号摘要",
                  doc_url: "https://mp.weixin.qq.com/s/example",
                  source: { title: "公众号名称" },
                  timestamp: 1780574904,
                },
              ],
            },
          ],
        }),
        { status: 200 }
      )
    );

    const bundle = await searchForTopics("测试查询", "default");

    expect(bundle.status).toBe("success");
    expect(bundle.results[0]?.source).toBe("wechat");
    expect(bundle.results[0]?.title).toBe("公众号文章");
    expect(JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body))).toMatchObject({
      publish_time_type: 2,
      sort_type: 2,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("calls wxrank only when SEARCH_PROVIDER=wxrank", async () => {
    vi.stubEnv("SEARCH_PROVIDER", "wxrank");
    vi.stubEnv("WXRANK_API_KEY", "test-key");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          data: {
            list: Array.from({ length: 5 }, (_, index) => ({
              pub_time: `2026-06-1${index} 10:00:00`,
              title: `Claude 神话模型历史文章 ${index}`,
              read_num: 20_000 + index,
              like_num: 300,
              look_num: 80,
              share_num: 120,
              art_url: `https://mp.weixin.qq.com/s?__biz=biz${index}&mid=1&idx=1&sn=sn${index}`,
              content: "Claude 神话 模型 正文",
            })),
          },
        }),
        { status: 200 }
      )
    );

    const bundle = await searchForTopics("Claude神话模型", "default");

    expect(bundle.status).toBe("success");
    expect(bundle.results[0]?.source).toBe("wechat");
    expect(bundle.results[0]?.engagementMetrics?.readCount).toBeDefined();
    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(
      "https://data.wxrank.com/weixin/artlist"
    );
    expect(JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body))).toMatchObject({
      key: "test-key",
      month: "202606",
      keyword: "Claude",
    });
  });

  it("assigns sort and freshness by search intent before calling Jizhila", async () => {
    vi.stubEnv("SEARCH_PROVIDER", "jizhila");
    vi.stubEnv("JIZHILA_API_KEY", "test-key");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          data: [
            {
              items: [
                {
                  title: "公众号文章",
                  desc: "公众号摘要",
                  doc_url: "https://mp.weixin.qq.com/s/example",
                },
              ],
            },
          ],
        }),
        { status: 200 }
      )
    );

    await searchForBrief("话题", "角度", "观点", "default");
    await searchForOutline("话题", "目标", "读者", "default");
    await searchForMeta("角度", "读者", "正文", "default");

    const bodies = fetchSpy.mock.calls.map((call) =>
      JSON.parse(String(call[1]?.body))
    );
    expect(bodies[0]).toMatchObject({
      publish_time_type: 3,
      sort_type: 0,
    });
    expect(bodies[1]).toMatchObject({
      publish_time_type: 3,
      sort_type: 0,
    });
    expect(bodies[2]).toMatchObject({
      publish_time_type: 2,
      sort_type: 2,
    });
  });
});
