import { describe, expect, it } from "vitest";
import {
  buildWxrankQueryTerms,
  filterAndRankHistoricalArticles,
  type WxrankHistoricalArticle,
} from "./wxrank-ranking";
import type { TopicSearchPlan } from "./topic-search-plan";

function article(
  title: string,
  content: string,
  pubTime: string,
  readCount = 0,
  overrides: Partial<WxrankHistoricalArticle> = {}
): WxrankHistoricalArticle {
  return {
    title,
    content,
    pubTime,
    url: `https://mp.weixin.qq.com/s/${encodeURIComponent(title)}`,
    readCount,
    likeCount: 0,
    lookingCount: 0,
    shareCount: 0,
    ...overrides,
  };
}

describe("buildWxrankQueryTerms", () => {
  it("removes business hint words from realtime search", () => {
    expect(buildWxrankQueryTerms("Claude神话模型 痛点")).toEqual({
      historyKeyword: "Claude",
      realtimeKeyword: "Claude神话模型",
      scoringTerms: ["Claude", "神话", "模型"],
    });
  });

  it("keeps meaningful audience and domain terms", () => {
    expect(buildWxrankQueryTerms("AI 编程 普通人 副业 痛点")).toEqual({
      historyKeyword: "AI",
      realtimeKeyword: "AI 编程 普通人 副业",
      scoringTerms: ["AI", "编程", "普通人", "副业"],
    });
  });

  it("removes stop words embedded in continuous Chinese text", () => {
    expect(buildWxrankQueryTerms("小红书爆款选题")).toEqual({
      historyKeyword: "小红书",
      realtimeKeyword: "小红书",
      scoringTerms: ["小红书"],
    });
  });

  it("selects a specific entity instead of a leading audience term", () => {
    expect(buildWxrankQueryTerms("普通人 Claude 使用技巧")).toEqual({
      historyKeyword: "Claude",
      realtimeKeyword: "普通人 Claude 使用技巧",
      scoringTerms: ["普通人", "Claude", "使用技巧"],
    });
  });

  it("selects an ASCII product entity from continuous mixed text", () => {
    expect(buildWxrankQueryTerms("普通人Claude使用技巧")).toMatchObject({
      historyKeyword: "Claude",
    });
  });

  it("preserves meaningful words that merely start with a stop word", () => {
    expect(buildWxrankQueryTerms("结构化写作")).toEqual({
      historyKeyword: "结构化写作",
      realtimeKeyword: "结构化写作",
      scoringTerms: ["结构化写作"],
    });
  });

  it.each(["痛点", "现状", "结构", "大纲", "人群", "最新", "爆款", "摘要", "选题"])(
    "removes the stop word %s",
    (stopWord) => {
      expect(buildWxrankQueryTerms(`Claude ${stopWord}`).scoringTerms).toEqual(["Claude"]);
    }
  );
});

describe("filterAndRankHistoricalArticles", () => {
  const now = new Date("2026-06-12T00:00:00+08:00");
  const gptPlan: TopicSearchPlan = {
    coreTopic: "GPT-5.6 对普通职场人的影响",
    historyKeyword: "GPT 职场",
    realtimeKeyword: "GPT-5.6 普通员工 职场转型",
    requiredTerms: ["GPT-5.6", "GPT"],
    relatedTerms: ["职场", "普通员工", "岗位转型"],
    excludedTerms: ["军事", "国际政治", "手机广告"],
  };

  it("keeps exact entities and rejects broad off-topic mentions", () => {
    const results = filterAndRankHistoricalArticles(
      [
        article(
          "GPT-5.6 如何改变普通职场人",
          "讨论岗位转型和工作效率",
          "2026-06-11 10:00:00",
          20_000
        ),
        article(
          "军事观察：两场对决改变世界",
          "正文顺带提到 GPT，但主题是国际政治",
          "2026-06-11 09:00:00",
          100_000
        ),
        article(
          "GPT 正在改变普通员工的工作方式",
          "职场岗位转型正在发生",
          "2026-06-11 08:00:00",
          10_000
        ),
      ],
      gptPlan,
      now
    );

    expect(results.map((item) => item.title)).toEqual([
      "GPT-5.6 如何改变普通职场人",
      "GPT 正在改变普通员工的工作方式",
    ]);
  });

  it("does not reject a relevant result when an excluded term is incidental", () => {
    const results = filterAndRankHistoricalArticles(
      [
        article(
          "GPT-5.6 职场转型指南",
          "文章用军事推演作了一句类比，主体仍是普通员工转型。",
          "2026-06-11 10:00:00",
          20_000
        ),
      ],
      gptPlan,
      now
    );

    expect(results.map((item) => item.title)).toEqual([
      "GPT-5.6 职场转型指南",
    ]);
  });

  it("keeps weak entity matches but ranks strongly relevant articles above them", () => {
    const results = filterAndRankHistoricalArticles(
      [
        article("Claude Fable 5 神话模型实测", "正文", "2026-06-10 10:00:00", 20_000),
        article("AI 融资出现新机会", "Claude 被顺带提及", "2026-06-11 10:00:00", 100_001),
        article("Claude 去年复盘", "神话模型", "2026-04-01 10:00:00", 50_000),
      ],
      ["Claude", "神话", "模型"],
      now
    );

    expect(results.map((item) => item.title)).toEqual([
      "Claude Fable 5 神话模型实测",
      "AI 融资出现新机会",
    ]);
  });

  it("keeps an entity-title match without exact secondary scoring terms", () => {
    const results = filterAndRankHistoricalArticles(
      [article("Claude 发布 Fable 5", "首发体验", "2026-06-11 10:00:00", 20_000)],
      ["Claude", "神话", "模型"],
      now
    );

    expect(results.map((item) => item.title)).toEqual(["Claude 发布 Fable 5"]);
  });

  it("requires the selected entity term to appear in the title or content", () => {
    const results = filterAndRankHistoricalArticles(
      [article("神话模型实测", "没有主题实体", "2026-06-10 10:00:00", 100_000)],
      ["Claude", "神话", "模型"],
      now
    );

    expect(results).toEqual([]);
  });

  it("uses the selected entity rather than a generic audience term as the admission gate", () => {
    const results = filterAndRankHistoricalArticles(
      [
        article("Claude 使用技巧", "提高日常效率", "2026-06-11 10:00:00", 20_000),
        article("普通人的效率工具", "没有主题实体", "2026-06-11 10:00:00", 100_000),
      ],
      ["普通人", "Claude", "使用技巧"],
      now
    );

    expect(results.map((item) => item.title)).toEqual(["Claude 使用技巧"]);
  });

  it("uses an ASCII entity from a continuous mixed term as the admission gate", () => {
    const queryTerms = buildWxrankQueryTerms("普通人Claude使用技巧");
    const results = filterAndRankHistoricalArticles(
      [
        article("Claude 使用技巧", "提高日常效率", "2026-06-11 10:00:00", 20_000),
        article("普通人的使用技巧", "没有产品实体", "2026-06-11 10:00:00", 100_000),
      ],
      queryTerms.scoringTerms,
      now
    );

    expect(results.map((item) => item.title)).toEqual(["Claude 使用技巧"]);
  });

  it("does not match an ASCII entity inside a longer alphabetic word", () => {
    const results = filterAndRankHistoricalArticles(
      [
        article("Retail marketing trends", "行业报告", "2026-06-11 10:00:00", 100_000),
        article("AI，正在改变营销", "行业报告", "2026-06-11 10:00:00", 20_000),
        article("AI模型发布", "行业报告", "2026-06-11 10:00:00", 10_000),
      ],
      ["AI"],
      now
    );

    expect(results.map((item) => item.title)).toEqual(["AI，正在改变营销", "AI模型发布"]);
  });

  it("allows numeric model suffixes after ASCII product entities", () => {
    const results = filterAndRankHistoricalArticles(
      [article("Claude5 发布", "模型升级", "2026-06-11 10:00:00", 10_000)],
      ["Claude"],
      now
    );

    expect(results.map((item) => item.title)).toEqual(["Claude5 发布"]);
  });

  it("rejects invalid dates and articles older than the rolling 30-day window", () => {
    const results = filterAndRankHistoricalArticles(
      [
        article("Claude 模型边界内", "神话", "2026-05-13 00:00:01", 1),
        article("Claude 模型边界外", "神话", "2026-05-12 23:59:59", 1),
        article("Claude 模型时间无效", "神话", "not-a-date", 1),
      ],
      ["Claude", "神话", "模型"],
      now
    );

    expect(results.map((item) => item.title)).toEqual(["Claude 模型边界内"]);
  });

  it("rejects calendar dates that Date.parse would roll into another month", () => {
    const results = filterAndRankHistoricalArticles(
      [
        article("Claude 模型非法日期", "神话", "2026-02-30 10:00:00", 1),
        article("Claude 模型合法日期", "神话", "2026-02-28T10:00:00+08:00", 1),
      ],
      ["Claude", "神话", "模型"],
      new Date("2026-03-05T00:00:00+08:00")
    );

    expect(results.map((item) => item.title)).toEqual(["Claude 模型合法日期"]);
  });

  it("ranks title matches above content-only matches", () => {
    const results = filterAndRankHistoricalArticles(
      [
        article("Claude 模型观察", "神话", "2026-06-10 10:00:00", 1),
        article("Claude 行业观察", "神话模型", "2026-06-11 10:00:00", 1_000_000),
      ],
      ["Claude", "神话", "模型"],
      now
    );

    expect(results.map((item) => item.title)).toEqual([
      "Claude 模型观察",
      "Claude 行业观察",
    ]);
  });

  it("uses weighted engagement and then publication recency as tie breakers", () => {
    const results = filterAndRankHistoricalArticles(
      [
        article("Claude 模型甲", "神话", "2026-06-09 10:00:00", 10_000),
        article("Claude 模型乙", "神话", "2026-06-10 10:00:00", 100, {
          likeCount: 2_000,
          lookingCount: 500,
          shareCount: 1_000,
        }),
        article("Claude 模型丙", "神话", "2026-06-11 10:00:00", 10_000),
      ],
      ["Claude", "神话", "模型"],
      now
    );

    expect(results.map((item) => item.title)).toEqual([
      "Claude 模型乙",
      "Claude 模型丙",
      "Claude 模型甲",
    ]);
  });

  it("deduplicates equivalent HTTP and HTTPS WeChat URLs", () => {
    const sharedPath =
      "mp.weixin.qq.com/s?__biz=test&mid=1&idx=1&sn=abc&chksm=tracking#rd";
    const results = filterAndRankHistoricalArticles(
      [
        article("Claude 模型旧文", "神话", "2026-06-10 10:00:00", 100, {
          url: `http://${sharedPath}`,
        }),
        article("Claude 模型新文", "神话", "2026-06-11 10:00:00", 200, {
          url: `https://${sharedPath.replace("chksm=tracking", "chksm=other&scene=1")}`,
        }),
      ],
      ["Claude", "神话", "模型"],
      now
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe("Claude 模型新文");
    expect(results[0]?.url).toBe(
      "https://mp.weixin.qq.com/s?__biz=test&mid=1&idx=1&sn=abc"
    );
  });

  it("canonicalizes short WeChat links and removes tracking parameters", () => {
    const results = filterAndRankHistoricalArticles(
      [
        article("Claude 模型旧文", "神话", "2026-06-10 10:00:00", 100, {
          url: "http://mp.weixin.qq.com/s/short-token?scene=1&sessionid=abc#rd",
        }),
        article("Claude 模型新文", "神话", "2026-06-11 10:00:00", 200, {
          url: "https://mp.weixin.qq.com/s/short-token?utm_source=test",
        }),
      ],
      ["Claude", "神话", "模型"],
      now
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe("Claude 模型新文");
    expect(results[0]?.url).toBe("https://mp.weixin.qq.com/s/short-token");
  });

  it.each([
    "javascript:alert(1)",
    "ftp://mp.weixin.qq.com/s/token",
    "https://example.com/s/token",
    "https://sub.mp.weixin.qq.com/s/token",
  ])("rejects unsafe or non-WeChat article URL %s", (url) => {
    const results = filterAndRankHistoricalArticles(
      [article("Claude 模型文章", "神话", "2026-06-11 10:00:00", 100, { url })],
      ["Claude", "神话", "模型"],
      now
    );

    expect(results).toEqual([]);
  });

  it("rejects incomplete long-form WeChat article links", () => {
    const results = filterAndRankHistoricalArticles(
      [
        article("Claude 模型缺少 sn", "神话", "2026-06-11 10:00:00", 100, {
          url: "https://mp.weixin.qq.com/s?__biz=test&mid=1&idx=1&scene=1",
        }),
        article("Claude 模型只有跟踪参数", "神话", "2026-06-11 10:00:00", 100, {
          url: "https://mp.weixin.qq.com/s?scene=1&sessionid=abc",
        }),
      ],
      ["Claude", "神话", "模型"],
      now
    );

    expect(results).toEqual([]);
  });

  it("rejects an empty short-link token", () => {
    const results = filterAndRankHistoricalArticles(
      [
        article("Claude 模型文章", "神话", "2026-06-11 10:00:00", 100, {
          url: "https://mp.weixin.qq.com/s/?scene=1",
        }),
      ],
      ["Claude", "神话", "模型"],
      now
    );

    expect(results).toEqual([]);
  });
});
