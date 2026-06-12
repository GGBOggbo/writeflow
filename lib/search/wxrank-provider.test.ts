import { describe, expect, it } from "vitest";
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

function createFakeClient(options: {
  history?: Array<unknown | Error>;
  realtime?: unknown | Error;
}) {
  const calls: Array<{ endpoint: string; input: unknown }> = [];
  const historyResponses = [...(options.history ?? [])];

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
    async getArticleInfo() {
      throw new Error("Task 3 must not call artinfo");
    },
    async getArticleComments() {
      throw new Error("Task 3 must not call getcm");
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

describe("wxrank search provider", () => {
  it("uses current-month history only when it has at least five qualified articles", async () => {
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

    expect(calls.map((call) => call.endpoint)).toEqual(["artlist"]);
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
    ]);
    expect(progress.find((event) => event.stepId === "engagement_enrichment_started")?.detail)
      .toBe("选用 5 篇 wxrank 历史库已有互动数据");
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
    expect(calls.map((call) => call.endpoint)).toEqual(["artlist"]);
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

    expect(calls.map((call) => call.endpoint)).toEqual(["artlist", "artlist"]);
    expect(calls.map((call) => call.input)).toMatchObject([
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

    expect(calls.map((call) => call.endpoint)).toEqual(["artlist", "artlist", "getso"]);
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

    expect(progress.map((event) => event.stepId)).not.toContain("deep_dive_started");
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

    expect(calls.map((call) => call.endpoint)).toEqual(["artlist", "artlist"]);
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

    expect(calls.map((call) => call.endpoint)).toEqual(["artlist", "artlist", "getso"]);
    expect(results).toHaveLength(2);
  });

  it("does not spend realtime search after non-transient historical business errors", async () => {
    const { client, calls } = createFakeClient({
      history: [new WxrankBusinessError("artlist", 1000)],
      realtime: [realtimeArticle(1)],
    });

    await expect(createProvider(client).search(baseInput())).rejects.toThrow(WxrankProviderError);
    expect(calls.map((call) => call.endpoint)).toEqual(["artlist"]);
  });

  it("returns nonempty history when realtime fallback fails", async () => {
    const { client, calls } = createFakeClient({
      history: [[article(1), article(2)], [article(3, { pub_time: "2026-05-30 10:00:00" })]],
      realtime: new Error("getso failed"),
    });

    const results = await createProvider(client).search(baseInput());

    expect(calls.map((call) => call.endpoint)).toEqual(["artlist", "artlist", "getso"]);
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
});
