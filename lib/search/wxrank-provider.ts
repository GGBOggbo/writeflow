import {
  WxrankBusinessError,
  WxrankConfigurationError,
  WxrankRequestError,
  createWxrankClient,
} from "./wxrank-client";
import type {
  WxrankClient,
  WxrankHistoricalArticle as WxrankClientHistoricalArticle,
  WxrankSearchArticle,
} from "./wxrank-client";
import type { SearchProvider } from "./provider";
import type { ProgressReporter } from "@/lib/progress/types";
import type { SearchQueryInput, SearchResult } from "./types";
import {
  buildWxrankQueryTerms,
  filterAndRankHistoricalArticles,
} from "./wxrank-ranking";
import type { WxrankHistoricalArticle as RankedHistoricalArticle } from "./wxrank-ranking";

const QUALIFIED_HISTORY_THRESHOLD = 5;
const RESULT_LIMIT = 8;

type WxrankSearchProviderOptions = {
  client?: WxrankClient;
  now?: () => Date;
};

export class WxrankProviderError extends Error {
  constructor() {
    super("wxrank 搜索失败，请稍后重试。");
    this.name = "WxrankProviderError";
  }
}

function cleanText(input?: string) {
  return (input ?? "")
    .replace(/<em\b[^>]*>/gi, "")
    .replace(/<\/em>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateSnippet(input: string, limit = 180) {
  const cleaned = cleanText(input);
  if (cleaned.length <= limit) {
    return cleaned;
  }

  return `${cleaned.slice(0, limit)}...`;
}

function getChinaMonthParts(date: Date) {
  const chinaTime = new Date(date.getTime() + 8 * 60 * 60 * 1_000);

  return {
    year: chinaTime.getUTCFullYear(),
    month: chinaTime.getUTCMonth() + 1,
  };
}

function toMonthKey(date: Date) {
  const { year, month } = getChinaMonthParts(date);
  return `${year}${String(month).padStart(2, "0")}`;
}

function previousMonth(date: Date) {
  const { year, month } = getChinaMonthParts(date);
  return new Date(Date.UTC(year, month - 2, 1, 16));
}

function toRankedHistoricalArticle(
  article: WxrankClientHistoricalArticle
): RankedHistoricalArticle {
  return {
    title: cleanText(article.title),
    content: cleanText(article.content),
    pubTime: article.pub_time,
    url: article.art_url,
    readCount: article.read_num,
    likeCount: article.like_num ?? 0,
    lookingCount: article.look_num ?? 0,
    shareCount: article.share_num ?? 0,
  };
}

function engagementFromHistorical(article: RankedHistoricalArticle) {
  return {
    readCount: article.readCount,
    likeCount: article.likeCount,
    lookingCount: article.lookingCount,
    shareCount: article.shareCount,
  };
}

function normalizeWechatUrl(value: string) {
  try {
    const url = new URL(value);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.hostname.toLocaleLowerCase() !== "mp.weixin.qq.com"
    ) {
      return value;
    }

    url.protocol = "https:";
    url.hostname = "mp.weixin.qq.com";
    url.hash = "";

    if (url.pathname === "/s") {
      const identityParams = new URLSearchParams();
      for (const param of ["__biz", "mid", "idx", "sn"]) {
        const paramValue = url.searchParams.get(param);
        if (!paramValue) {
          return url.toString();
        }

        identityParams.set(param, paramValue);
      }
      url.search = identityParams.toString();
    } else if (/^\/s\/[^/]+$/.test(url.pathname)) {
      url.search = "";
    }

    return url.toString();
  } catch {
    return value;
  }
}

function historicalNotes(article: WxrankClientHistoricalArticle) {
  return [
    article.wx_type ? `公众号分类：${cleanText(article.wx_type)}` : "",
    article.copyright ? `原创状态：${cleanText(article.copyright)}` : "",
  ].filter(Boolean);
}

function mapHistoricalResult(
  ranked: RankedHistoricalArticle,
  originalByUrl: Map<string, WxrankClientHistoricalArticle>
): SearchResult {
  const original = originalByUrl.get(ranked.url);

  return {
    title: cleanText(ranked.title),
    snippet: truncateSnippet(ranked.content),
    url: ranked.url,
    publishedAt: ranked.pubTime,
    source: "wechat",
    engagementMetrics: engagementFromHistorical(ranked),
    notes: original ? historicalNotes(original) : undefined,
  };
}

function mapRealtimeResult(article: WxrankSearchArticle): SearchResult {
  return {
    title: cleanText(article.title),
    snippet: truncateSnippet(article.desc),
    url: normalizeWechatUrl(article.art_url),
    publishedAt: article.pub_time,
    source: "wechat",
    notes: article.wx_name ? [`公众号：${cleanText(article.wx_name)}`] : undefined,
  };
}

function dedupeByUrl(results: SearchResult[]) {
  const seen = new Set<string>();

  return results.filter((result) => {
    const key = normalizeWechatUrl(result.url);
    if (!result.title || !key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    result.url = key;
    return true;
  });
}

function buildOriginalArticleMap(articles: WxrankClientHistoricalArticle[]) {
  return new Map(
    articles.map((article) => [normalizeWechatUrl(article.art_url), article])
  );
}

async function fetchHistoricalMonth(
  client: WxrankClient,
  month: string,
  keyword: string
) {
  try {
    return (await client.listHotArticles({ month, keyword })).list;
  } catch (error) {
    if (isFatalHistoricalError(error)) {
      throw error;
    }

    return null;
  }
}

function isFatalHistoricalError(error: unknown) {
  if (
    error instanceof WxrankConfigurationError ||
    error instanceof WxrankBusinessError
  ) {
    return true;
  }

  if (error instanceof WxrankRequestError) {
    return error.message.includes("response data was invalid") ||
      error.message.includes("response envelope was invalid");
  }

  return true;
}

function emitProgress(
  onProgress: ProgressReporter | undefined,
  results: SearchResult[]
) {
  const historicalCount = results.filter((result) => result.engagementMetrics).length;
  onProgress?.({
    stepId: "web_search_completed",
    label: "扫描参考池完成",
  });
  onProgress?.({
    stepId: "results_normalized",
    label: "筛选素材",
    detail: `留下 ${results.length} 篇高相关素材`,
  });
  onProgress?.({
    stepId: "engagement_enrichment_started",
    label: "甄别热度",
    detail: historicalCount > 0
      ? `选用 ${historicalCount} 篇 wxrank 历史库已有互动数据`
      : "实时搜索结果暂无阅读互动数据",
  });
  onProgress?.({
    stepId: "engagement_enrichment_completed",
    label: "甄别热度完成",
  });
}

export function createWxrankSearchProvider(
  options: WxrankSearchProviderOptions = {}
): SearchProvider {
  return {
    async search(input: SearchQueryInput, onProgress?: ProgressReporter) {
      const client = options.client ?? createWxrankClient();
      const now = options.now?.() ?? new Date();
      const queryTerms = buildWxrankQueryTerms(input.query);
      const currentMonth = toMonthKey(now);
      const previousMonthKey = toMonthKey(previousMonth(now));
      const allHistoricalRaw: WxrankClientHistoricalArticle[] = [];

      onProgress?.({
        stepId: "search_query_built",
        label: "拆解命题",
        detail: `历史词：${queryTerms.historyKeyword}；实时词：${queryTerms.realtimeKeyword}`,
      });
      onProgress?.({
        stepId: "web_search_started",
        label: "扫描参考池",
        detail: "优先扫描 wxrank 历史参考池",
      });

      let currentHistory: WxrankClientHistoricalArticle[] | null;
      try {
        currentHistory = await fetchHistoricalMonth(
          client,
          currentMonth,
          queryTerms.historyKeyword
        );
      } catch {
        throw new WxrankProviderError();
      }
      if (currentHistory) {
        allHistoricalRaw.push(...currentHistory);
      }

      let rankedHistory = filterAndRankHistoricalArticles(
        allHistoricalRaw.map(toRankedHistoricalArticle),
        queryTerms.scoringTerms,
        now
      );

      if (rankedHistory.length < QUALIFIED_HISTORY_THRESHOLD) {
        let previousHistory: WxrankClientHistoricalArticle[] | null;
        try {
          previousHistory = await fetchHistoricalMonth(
            client,
            previousMonthKey,
            queryTerms.historyKeyword
          );
        } catch {
          throw new WxrankProviderError();
        }
        if (previousHistory) {
          allHistoricalRaw.push(...previousHistory);
        }

        rankedHistory = filterAndRankHistoricalArticles(
          allHistoricalRaw.map(toRankedHistoricalArticle),
          queryTerms.scoringTerms,
          now
        );
      }

      const originalByUrl = buildOriginalArticleMap(allHistoricalRaw);
      let results = rankedHistory
        .map((article) => mapHistoricalResult(article, originalByUrl))
        .slice(0, RESULT_LIMIT);

      if (rankedHistory.length < QUALIFIED_HISTORY_THRESHOLD) {
        try {
          const realtime = await client.searchArticles({
            keyword: queryTerms.realtimeKeyword || input.query,
            sortType: 4,
          });
          results = dedupeByUrl([
            ...results,
            ...realtime.map(mapRealtimeResult),
          ]).slice(0, RESULT_LIMIT);
        } catch {
          if (results.length === 0) {
            throw new WxrankProviderError();
          }
        }
      }

      results = dedupeByUrl(results).slice(0, RESULT_LIMIT);
      if (results.length === 0) {
        throw new WxrankProviderError();
      }

      emitProgress(onProgress, results);
      return results;
    },
  };
}

export const wxrankSearchProvider = createWxrankSearchProvider();
