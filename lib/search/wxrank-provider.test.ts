import { afterEach, describe, expect, it, vi } from "vitest";
import type { WxrankClient } from "./wxrank-client";
import { WxrankBusinessError, WxrankRequestError } from "./wxrank-client";
import {
  createWxrankSearchProvider,
  WxrankProviderError,
} from "./wxrank-provider";
import type { SearchQueryInput } from "./types";
import type { WorkflowProgressEvent } from "@/lib/progress/types";

const fixedNow = new Date("2026-06-12T00:00:00+08:00");

function baseInput(query = "Claude神话模型 痛点"): SearchQueryInput {
  return {
    query,
    intent: "topics",
    mode: "default",
    freshness: "pastMonth",
    sortType: "hot",
  };
}

function plannedGptInput(): SearchQueryInput {
  return {
    ...baseInput("GPT-5.6"),
    topicPlan: {
      coreTopic: "GPT-5.6 对普通职场人的影响",
      historyKeyword: "GPT 职场",
      realtimeKeyword: "GPT-5.6 普通员工 职场转型",
      requiredTerms: ["GPT-5.6", "GPT"],
      relatedTerms: ["职场", "普通员工", "岗位转型"],
      excludedTerms: ["军事", "国际政治", "手机广告"],
    },
  };
}

function article(
  index: number,
  overrides: Partial<{
    title: string;
    content: string;
    pub_time: string;
    art_url: string;
    read_num: number;
    like_num: number;
    look_num: number;
    share_num: number;
    wx_type: string;
    copyright: string;
  }> = {}
) {
  return {
    title: overrides.title ?? `Claude 神话模型实测 ${index}`,
    content: overrides.content ?? "Claude 神话 模型 正文内容，适合做选题参考。",
    pub_time: overrides.pub_time ?? `2026-06-0${index} 10:00:00`,
    art_url:
      overrides.art_url ??
      `https://mp.weixin.qq.com/s?__biz=biz${index}&mid=1&idx=1&sn=sn${index}`,
    read_num: overrides.read_num ?? 10_000 + index,
    like_num: overrides.like_num ?? 100 + index,
    look_num: overrides.look_num ?? 10 + index,
    share_num: overrides.share_num ?? 20 + index,
    wx_type: overrides.wx_type ?? "科技",
    copyright: overrides.copyright ?? "原创",
  };
}

function realtimeArticle(
  index: number,
  overrides: Partial<{
    title: string;
    desc: string;
    art_url: string;
    wx_name: string;
    pub_time: string;
  }> = {}
) {
  return {
    title: overrides.title ?? `Claude 神话模型实时文章 ${index}`,
    desc: overrides.desc ?? "实时搜索结果摘要",
    art_url: overrides.art_url ?? `https://mp.weixin.qq.com/s/realtime-${index}`,
    wx_name: overrides.wx_name ?? "AI观察",
    pub_time: overrides.pub_time ?? "2026-06-11 10:00:00",
    pic_url: "",
  };
}

function articleInfo(
  index: number,
  overrides: Partial<{
    article_url: string;
    title: string;
    html: string;
    text: string;
    pub_time: string;
    comment_id: string | number;
  }> = {}
) {
  return {
    article_url:
      overrides.article_url ?? `https://mp.weixin.qq.com/s/canonical-${index}`,
    title: overrides.title ?? `Claude 神话模型深拆 ${index}`,
    html: overrides.html ?? `<p>Claude 神话模型深拆正文 ${index}</p>`,
    text: overrides.text ?? `Claude 神话模型深拆正文 ${index}`,
    pub_time: overrides.pub_time ?? "2026-06-11 10:00:00",
    comment_id: overrides.comment_id,
  };
}

function comment(
  index: number,
  overrides: Partial<{
    content: string;
    like_num: number;
    create_time: string;
    is_top: number;
  }> = {}
) {
  return {
    content: overrides.content ?? `评论 ${index}`,
    like_num: overrides.like_num ?? index,
    create_time: overrides.create_time ?? `2026-06-11 10:0${index}:00`,
    is_top: overrides.is_top,
  };
}

function createFakeClient(options: {
  history?: Array<unknown | Error>;
  realtime?: unknown | Error;
  articleInfo?: Array<unknown | Error>;
  comments?: Array<unknown | Error>;
}) {
  const calls: Array<{ endpoint: string; input: unknown }> = [];
  const historyResponses = [...(options.history ?? [])];
  const articleInfoResponses = [...(options.articleInfo ?? [])];
  const commentResponses = [...(options.comments ?? [])];

  const client: WxrankClient = {
    async listHotArticles(input) {
      calls.push({ endpoint: "artlist", input });
      const response = historyResponses.shift();
      if (response instanceof Error) {
        throw response;
      }
      return { list: (response as ReturnType<typeof article>[] | undefined) ?? [] };
    },
    async searchArticles(input) {
      calls.push({ endpoint: "getso", input });
      if (options.realtime instanceof Error) {
        throw options.realtime;
      }
      return (options.realtime as ReturnType<typeof realtimeArticle>[] | undefined) ?? [];
    },
    async getArticleInfo(input) {
      calls.push({ endpoint: "artinfo", input });
      const response = articleInfoResponses.shift();
      if (response instanceof Error) {
        throw response;
      }
      return (
        (response as ReturnType<typeof articleInfo> | undefined) ??
        articleInfo(1, { article_url: input })
      );
    },
    async getArticleComments(input) {
      calls.push({ endpoint: "getcm", input });
      const response = commentResponses.shift();
      if (response instanceof Error) {
        throw response;
      }
      return (response as ReturnType<typeof comment>[] | undefined) ?? [];
    },
  };

  return { client, calls };
}

function createProvider(client: WxrankClient) {
  return createWxrankSearchProvider({ client, now: () => fixedNow });
}

function createProviderAt(client: WxrankClient, now: Date) {
  return createWxrankSearchProvider({ client, now: () => now });
}

function searchEndpoints(calls: Array<{ endpoint: string }>) {
  return calls
    .map((call) => call.endpoint)
    .filter((endpoint) => endpoint === "artlist" || endpoint === "getso");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("wxrank search provider", () => {
  it("uses planned keywords and filters realtime results with the same gate", async () => {
    vi.stubEnv("LOG_LEVEL", "info");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const { client, calls } = createFakeClient({
      history: [[], []],
      realtime: [
        realtimeArticle(1, {
          title: "军事观察：两场对决改变世界",
          desc: "正文顺带提到 GPT，但主题是国际政治。",
        }),
        realtimeArticle(2, {
          title: "GPT-5.6 如何改变普通职场人",
          desc: "普通员工需要重新规划岗位转型。",
        }),
      ],
      articleInfo: [
        articleInfo(1, {
          title: "GPT-5.6 如何改变普通职场人",
          text: "普通员工需要重新规划岗位转型。",
          html: "<p>普通员工需要重新规划岗位转型。</p>",
        }),
      ],
    });

    const results = await createProvider(client).search(plannedGptInput());

    expect(calls.filter((call) => call.endpoint === "artlist").map((call) => call.input))
      .toMatchObject([
        { keyword: "GPT 职场" },
        { keyword: "GPT 职场" },
      ]);
    expect(calls.find((call) => call.endpoint === "getso")?.input).toMatchObject({
      keyword: "GPT-5.6 普通员工 职场转型",
    });
    expect(results.map((result) => result.title)).toEqual([
      "GPT-5.6 如何改变普通职场人",
    ]);
    const logs = logSpy.mock.calls.map((call) => call.join(" ")).join("\n");
    expect(logs).toContain("[wxrank] → artlist");
    expect(logs).toContain('"month":"202606"');
    expect(logs).toContain('"raw":0');
    expect(logs).toContain("[wxrank] → getso");
    expect(logs).toContain('"raw":2');
    expect(logs).toContain('"qualified":1');
    expect(logs).toContain("route=realtime-fallback");
    expect(logs).not.toContain("apiKey");
  });

  it("uses current-month history only when it has at least five qualified articles", async () => {
    vi.stubEnv("LOG_LEVEL", "info");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const { client, calls } = createFakeClient({
      history: [
        [
          article(1, {
            title: '<em class="highlight">Claude</em> 神话模型实测 1',
            content: '<p><em class="highlight">Claude</em> 神话 模型 正文</p>',
            read_num: 20_000,
            like_num: 300,
            look_num: 80,
            share_num: 120,
          }),
          article(2),
          article(3),
          article(4),
          article(5),
        ],
      ],
    });
    const progress: WorkflowProgressEvent[] = [];

    const results = await createProvider(client).search(baseInput(), (event) =>
      progress.push(event)
    );

    expect(searchEndpoints(calls)).toEqual(["artlist"]);
    expect(calls[0]?.input).toMatchObject({
      month: "202606",
      keyword: "Claude",
    });
    expect(JSON.stringify(calls[0]?.input)).not.toContain("痛点");
    expect(results).toHaveLength(5);
    expect(results[0]).toMatchObject({
      title: "Claude 神话模型实测 1",
      source: "wechat",
      engagementMetrics: {
        readCount: 20_000,
        likeCount: 300,
        lookingCount: 80,
        shareCount: 120,
      },
      notes: ["公众号分类：科技", "原创状态：原创"],
    });
    expect(results[0]?.snippet).not.toContain("<em");
    expect(progress.map((event) => [event.stepId, event.label])).toEqual([
      ["search_query_built", "拆解命题"],
      ["web_search_started", "扫描参考池"],
      ["web_search_completed", "扫描参考池完成"],
      ["results_normalized", "筛选素材"],
      ["engagement_enrichment_started", "甄别热度"],
      ["engagement_enrichment_completed", "甄别热度完成"],
      ["deep_dive_started", "拆解标杆"],
      ["deep_dive_completed", "拆解标杆完成"],
    ]);
    expect(progress.find((event) => event.stepId === "engagement_enrichment_started")?.detail)
      .toBe("选用 5 篇 wxrank 历史库已有互动数据");
    const logs = logSpy.mock.calls.map((call) => call.join(" ")).join("\n");
    expect(logs).toContain("[wxrank] → artlist");
    expect(logs).toContain('"raw":5');
    expect(logs).toContain('"qualified":5');
    expect(logs).toContain("route=history-only");
    expect(logs).not.toContain("getso");
  });

  it("calculates current and previous months in China time across the year boundary", async () => {
    const { client, calls } = createFakeClient({
      history: [
        [
          article(1, { pub_time: "2026-01-01 00:20:00" }),
          article(2, { pub_time: "2026-01-01 00:21:00" }),
          article(3, { pub_time: "2026-01-01 00:22:00" }),
          article(4, { pub_time: "2026-01-01 00:23:00" }),
          article(5, { pub_time: "2026-01-01 00:24:00" }),
        ],
      ],
    });

    await createProviderAt(
      client,
      new Date("2025-12-31T16:30:00.000Z")
    ).search(baseInput());

    expect(calls[0]?.input).toMatchObject({ month: "202601" });
    expect(searchEndpoints(calls)).toEqual(["artlist"]);
  });

  it("queries previous-month history when current month is insufficient and avoids realtime once history reaches five", async () => {
    const { client, calls } = createFakeClient({
      history: [
        [article(1), article(2), article(3)],
        [
          article(4, {
            pub_time: "2026-05-30 10:00:00",
            art_url: "http://mp.weixin.qq.com/s?__biz=biz2&mid=1&idx=1&sn=sn2",
            read_num: 50_000,
          }),
          article(5, {
            pub_time: "2026-05-29 10:00:00",
            read_num: 40_000,
          }),
          article(6, {
            pub_time: "2026-05-28 10:00:00",
          }),
        ],
      ],
    });

    const results = await createProvider(client).search(baseInput());

    expect(searchEndpoints(calls)).toEqual(["artlist", "artlist"]);
    expect(calls.filter((call) => call.endpoint === "artlist").map((call) => call.input))
      .toMatchObject([
      { month: "202606", keyword: "Claude" },
      { month: "202605", keyword: "Claude" },
    ]);
    expect(results).toHaveLength(5);
    expect(new Set(results.map((result) => result.url)).size).toBe(5);
    expect(results[0]?.engagementMetrics?.readCount).toBe(50_000);
  });

  it("falls back to realtime search when two months of history stay below five", async () => {
    const duplicateUrl = "https://mp.weixin.qq.com/s?__biz=biz1&mid=1&idx=1&sn=sn1";
    const { client, calls } = createFakeClient({
      history: [
        [article(1, { art_url: duplicateUrl }), article(2)],
        [article(3, { pub_time: "2026-05-30 10:00:00" }), article(4, { pub_time: "2026-05-29 10:00:00" })],
      ],
      realtime: [
        realtimeArticle(1, {
          title: '<em class="highlight">Claude</em> 神话模型实时重复',
          desc: '<em class="highlight">Claude</em> 实时摘要',
          art_url: "http://mp.weixin.qq.com/s?__biz=biz1&mid=1&idx=1&sn=sn1",
        }),
        ...Array.from({ length: 8 }, (_, index) => realtimeArticle(index + 2)),
      ],
    });

    const results = await createProvider(client).search(baseInput());

    expect(searchEndpoints(calls)).toEqual(["artlist", "artlist", "getso"]);
    expect(calls[2]?.input).toMatchObject({
      keyword: "Claude神话模型",
      sortType: 4,
    });
    expect(results).toHaveLength(8);
    expect(new Set(results.map((result) => result.url)).size).toBe(8);
    expect(results.map((result) => result.title).join("\n")).not.toContain("<em");
    expect(results.some((result) => result.notes?.includes("公众号：AI观察"))).toBe(true);
  });

  it("does not claim historical engagement data when realtime fallback supplies all results", async () => {
    const { client } = createFakeClient({
      history: [[], []],
      realtime: [realtimeArticle(1), realtimeArticle(2)],
    });
    const progress: WorkflowProgressEvent[] = [];

    await createProvider(client).search(baseInput(), (event) => progress.push(event));

    expect(progress.find((event) => event.stepId === "engagement_enrichment_started")?.detail)
      .toBe("实时搜索结果暂无阅读互动数据");
  });

  it("continues to previous-month history after current-month history fails", async () => {
    const { client, calls } = createFakeClient({
      history: [
        new WxrankRequestError("artlist", "current timeout"),
        Array.from({ length: 5 }, (_, index) =>
          article(index + 1, { pub_time: `2026-05-2${index + 3} 10:00:00` })
        ),
      ],
    });

    const results = await createProvider(client).search(baseInput());

    expect(searchEndpoints(calls)).toEqual(["artlist", "artlist"]);
    expect(results).toHaveLength(5);
  });

  it("uses realtime when both history months fail", async () => {
    const { client, calls } = createFakeClient({
      history: [
        new WxrankRequestError("artlist", "current timeout"),
        new WxrankRequestError("artlist", "previous timeout"),
      ],
      realtime: [realtimeArticle(1), realtimeArticle(2)],
    });

    const results = await createProvider(client).search(baseInput());

    expect(searchEndpoints(calls)).toEqual(["artlist", "artlist", "getso"]);
    expect(results).toHaveLength(2);
  });

  it("does not spend realtime search after non-transient historical business errors", async () => {
    const { client, calls } = createFakeClient({
      history: [new WxrankBusinessError("artlist", 1000)],
      realtime: [realtimeArticle(1)],
    });

    await expect(createProvider(client).search(baseInput())).rejects.toThrow(WxrankProviderError);
    expect(searchEndpoints(calls)).toEqual(["artlist"]);
  });

  it("returns nonempty history when realtime fallback fails", async () => {
    const { client, calls } = createFakeClient({
      history: [[article(1), article(2)], [article(3, { pub_time: "2026-05-30 10:00:00" })]],
      realtime: new Error("getso failed"),
    });

    const results = await createProvider(client).search(baseInput());

    expect(searchEndpoints(calls)).toEqual(["artlist", "artlist", "getso"]);
    expect(results).toHaveLength(3);
  });

  it("throws a sanitized provider error when all search paths fail", async () => {
    const { client } = createFakeClient({
      history: [new Error("current failed with test-key"), new Error("previous failed with body")],
      realtime: new Error("getso failed with test-key"),
    });

    await expect(createProvider(client).search(baseInput())).rejects.toThrow(WxrankProviderError);
    await expect(createProvider(client).search(baseInput())).rejects.toThrow(
      "wxrank 搜索失败，请稍后重试。"
    );

    try {
      await createProvider(client).search(baseInput());
    } catch (error) {
      expect(String(error)).not.toContain("test-key");
      expect(String(error)).not.toContain("body");
    }
  });

  it("deep-dives exactly two selected articles with html and comments", async () => {
    const { client, calls } = createFakeClient({
      history: [Array.from({ length: 8 }, (_, index) => article(index + 1))],
      articleInfo: [
        articleInfo(1, {
          article_url: "https://mp.weixin.qq.com/s/canonical-one",
          comment_id: "comment-one",
        }),
        articleInfo(2, {
          article_url: "https://mp.weixin.qq.com/s/canonical-two",
          comment_id: "comment-two",
        }),
      ],
      comments: [
        [
          comment(1, { content: "<p>普通评论</p>", like_num: 500 }),
          comment(2, { content: "置顶评论", like_num: 1, is_top: 1 }),
          comment(3, { content: "高赞评论", like_num: 900 }),
        ],
        [comment(4, { content: "第二篇评论", like_num: 300 })],
      ],
    });
    const progress: WorkflowProgressEvent[] = [];

    const results = await createProvider(client).search(baseInput(), (event) =>
      progress.push(event)
    );

    expect(calls.filter((call) => call.endpoint === "artinfo")).toHaveLength(2);
    expect(calls.filter((call) => call.endpoint === "getcm")).toHaveLength(2);
    expect(results.filter((result) => result.articleHtml)).toHaveLength(2);
    expect(results.filter((result) => result.comments?.length)).toHaveLength(2);
    expect(results.some((result) => result.url === "https://mp.weixin.qq.com/s/canonical-one"))
      .toBe(true);
    expect(results.find((result) => result.url === "https://mp.weixin.qq.com/s/canonical-one")
      ?.comments?.map((item) => item.content)).toEqual([
        "置顶评论",
        "高赞评论",
        "普通评论",
      ]);
    expect(calls.filter((call) => call.endpoint === "getcm").map((call) => call.input))
      .toEqual([
        {
          url: "https://mp.weixin.qq.com/s/canonical-one",
          commentId: "comment-one",
        },
        {
          url: "https://mp.weixin.qq.com/s/canonical-two",
          commentId: "comment-two",
        },
      ]);
    expect(progress.map((event) => event.stepId)).toContain("deep_dive_started");
    expect(progress.map((event) => event.stepId)).toContain("deep_dive_completed");
  });

  it("skips comment enrichment when article info has no comment id", async () => {
    const { client, calls } = createFakeClient({
      history: [Array.from({ length: 5 }, (_, index) => article(index + 1))],
      articleInfo: [
        articleInfo(1, { comment_id: undefined }),
        articleInfo(2, { comment_id: undefined }),
      ],
    });

    const results = await createProvider(client).search(baseInput());

    expect(calls.filter((call) => call.endpoint === "artinfo")).toHaveLength(2);
    expect(calls.filter((call) => call.endpoint === "getcm")).toHaveLength(0);
    expect(results.filter((result) => result.articleHtml)).toHaveLength(2);
  });

  it("keeps base results when one artinfo call and one getcm call fail", async () => {
    const { client, calls } = createFakeClient({
      history: [Array.from({ length: 8 }, (_, index) => article(index + 1))],
      articleInfo: [
        new Error("artinfo failed"),
        articleInfo(2, { comment_id: "comment-two" }),
      ],
      comments: [new Error("getcm failed")],
    });

    const results = await createProvider(client).search(baseInput());

    expect(results).toHaveLength(8);
    expect(calls.filter((call) => call.endpoint === "artinfo")).toHaveLength(2);
    expect(calls.filter((call) => call.endpoint === "getcm")).toHaveLength(1);
    expect(results.filter((result) => result.articleHtml)).toHaveLength(1);
    expect(results.filter((result) => result.comments?.length)).toHaveLength(0);
    expect(results.map((result) => result.title)).toContain("Claude 神话模型实测 1");
  });

  it("respects WXRANK_COMMENT_TOP_N when attaching comments", async () => {
    vi.stubEnv("WXRANK_COMMENT_TOP_N", "2");
    const { client } = createFakeClient({
      history: [Array.from({ length: 5 }, (_, index) => article(index + 1))],
      articleInfo: [
        articleInfo(1, { comment_id: "comment-one" }),
        articleInfo(2, { comment_id: "comment-two" }),
      ],
      comments: [
        [
          comment(1, { content: "低赞评论", like_num: 1 }),
          comment(2, { content: "置顶评论", like_num: 0, is_top: 1 }),
          comment(3, { content: "高赞评论", like_num: 100 }),
        ],
        [
          comment(4, { content: "第二篇高赞", like_num: 80 }),
          comment(5, { content: "第二篇低赞", like_num: 8 }),
          comment(6, { content: "第二篇更低赞", like_num: 2 }),
        ],
      ],
    });

    const results = await createProvider(client).search(baseInput());

    const commentSets = results
      .filter((result) => result.comments?.length)
      .map((result) => result.comments?.map((item) => item.content));
    expect(commentSets).toEqual([
      ["置顶评论", "高赞评论"],
      ["第二篇高赞", "第二篇低赞"],
    ]);
  });

  it("does not replace a result URL with an invalid article_url from artinfo", async () => {
    const originalUrl = "https://mp.weixin.qq.com/s?__biz=biz1&mid=1&idx=1&sn=sn1";
    const { client } = createFakeClient({
      history: [
        Array.from({ length: 5 }, (_, index) =>
          article(index + 1, index === 0 ? { art_url: originalUrl } : {})
        ),
      ],
      articleInfo: [
        articleInfo(1, {
          article_url: "https://mp.weixin.qq.com/s?scene=tracking-only",
          comment_id: undefined,
        }),
        articleInfo(2, { comment_id: undefined }),
      ],
    });

    const results = await createProvider(client).search(baseInput());

    expect(results.some((result) => result.url === originalUrl)).toBe(true);
    expect(results.some((result) => result.url === "https://mp.weixin.qq.com/s?scene=tracking-only"))
      .toBe(false);
  });

  it("deduplicates results after artinfo canonical URLs converge", async () => {
    const canonical = "https://mp.weixin.qq.com/s/canonical-same";
    const { client } = createFakeClient({
      history: [Array.from({ length: 5 }, (_, index) => article(index + 1))],
      articleInfo: [
        articleInfo(1, { article_url: `${canonical}?scene=1`, comment_id: undefined }),
        articleInfo(2, { article_url: `${canonical}?scene=2`, comment_id: undefined }),
      ],
    });

    const results = await createProvider(client).search(baseInput());

    expect(results.filter((result) => result.url === canonical)).toHaveLength(1);
    expect(new Set(results.map((result) => result.url)).size).toBe(results.length);
  });

  it("keeps enriched data when canonical URL collides with an earlier base result", async () => {
    const earlierUrl = "https://mp.weixin.qq.com/s/canonical-earlier";
    const { client } = createFakeClient({
      history: [
        [
          article(1, {
            art_url: earlierUrl,
            read_num: 1,
            like_num: 0,
            look_num: 0,
            share_num: 0,
          }),
          article(2, {
            art_url: "https://mp.weixin.qq.com/s/deep-candidate",
            read_num: 100_000,
            like_num: 10_000,
            look_num: 5_000,
            share_num: 8_000,
          }),
          article(3),
          article(4),
          article(5),
        ],
      ],
      articleInfo: [
        articleInfo(1, {
          article_url: earlierUrl,
          html: "<p>已经付费拿到的正文</p>",
          comment_id: undefined,
        }),
        articleInfo(2, { comment_id: undefined }),
      ],
    });

    const results = await createProvider(client).search(baseInput());
    const collided = results.find((result) => result.url === earlierUrl);

    expect(results.filter((result) => result.url === earlierUrl)).toHaveLength(1);
    expect(collided?.articleHtml).toBe("<p>已经付费拿到的正文</p>");
  });
});
