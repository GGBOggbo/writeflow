import {
  WxrankBusinessError,
  WxrankConfigurationError,
  WxrankRequestError,
  createWxrankClient,
} from "./wxrank-client";
import type {
  WxrankArticleInfo,
  WxrankClient,
  WxrankComment,
  WxrankHistoricalArticle as WxrankClientHistoricalArticle,
  WxrankSearchArticle,
} from "./wxrank-client";
import type { SearchProvider } from "./provider";
import type { ProgressReporter } from "@/lib/progress/types";
import { log } from "@/lib/debug";
import type {
  SearchArticleComment,
  SearchQueryInput,
  SearchResult,
} from "./types";
import { selectDeepDiveArticles } from "./jizhila-selection";
import {
  buildWxrankQueryTerms,
  evaluateTopicPlanRelevance,
  filterAndRankHistoricalArticles,
} from "./wxrank-ranking";
import type { WxrankHistoricalArticle as RankedHistoricalArticle } from "./wxrank-ranking";

const QUALIFIED_HISTORY_THRESHOLD = 5;
const RESULT_LIMIT = 8;
const DEFAULT_DEEP_DIVE_LIMIT = 8;

function logKeyword(value: string) {
  return value.replace(/[\n\r\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
}

function logText(value: string, limit = 120) {
  return cleanText(value).replace(/[\n\r\t]+/g, " ").slice(0, limit);
}

function errorType(error: unknown) {
  return error instanceof Error ? error.name : typeof error;
}

function incrementReason(counts: Record<string, number>, reason: string) {
  counts[reason] = (counts[reason] ?? 0) + 1;
}

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

function isSafeWechatArticleUrl(value?: string) {
  if (!value) return false;

  try {
    const url = new URL(value);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.hostname.toLocaleLowerCase() !== "mp.weixin.qq.com"
    ) {
      return false;
    }

    if (/^\/s\/[^/]+$/.test(url.pathname)) {
      return true;
    }

    if (url.pathname !== "/s") {
      return false;
    }

    return ["__biz", "mid", "idx", "sn"].every((param) =>
      Boolean(url.searchParams.get(param))
    );
  } catch {
    return false;
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
  const deduped: SearchResult[] = [];

  for (const result of results) {
    const key = normalizeWechatUrl(result.url);
    if (!result.title || !key) {
      continue;
    }

    const normalizedResult = { ...result, url: key };
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(normalizedResult);
      continue;
    }

    const existingIndex = deduped.findIndex((item) => item.url === key);
    const existing = existingIndex >= 0 ? deduped[existingIndex] : undefined;
    if (existing && shouldPreferResult(normalizedResult, existing)) {
      deduped[existingIndex] = normalizedResult;
    }
  }

  return deduped;
}

function enrichmentScore(result: SearchResult) {
  return (
    (result.articleHtml ? 2 : 0) +
    (result.comments && result.comments.length > 0 ? 1 : 0)
  );
}

function shouldPreferResult(candidate: SearchResult, existing: SearchResult) {
  return enrichmentScore(candidate) > enrichmentScore(existing);
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

    log.warn("wxrank", "artlist failed; continuing route", {
      event: "search.provider.failed",
      endpoint: "artlist",
      month,
      keyword: logKeyword(keyword),
      reason: error instanceof Error ? error.message : "unknown error",
    });
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

function getPositiveEnvInt(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function parseComment(item: WxrankComment): SearchArticleComment | null {
  const content = cleanText(item.content);
  if (!content) return null;

  return {
    content,
    likeCount: typeof item.like_num === "number" ? item.like_num : undefined,
    isTop:
      "is_top" in item
        ? item.is_top === 1 || item.is_top === true || item.is_top === "1"
        : undefined,
    createdAt: item.create_time,
  };
}

function parseComments(comments: WxrankComment[]) {
  const commentLimit = getPositiveEnvInt("WXRANK_COMMENT_TOP_N", 10);

  return comments
    .map(parseComment)
    .filter((comment): comment is SearchArticleComment => Boolean(comment))
    .sort((left, right) => {
      if (left.isTop !== right.isTop) return left.isTop ? -1 : 1;
      return (right.likeCount ?? 0) - (left.likeCount ?? 0);
    })
    .slice(0, commentLimit);
}

function applyArticleInfo(result: SearchResult, articleInfo: WxrankArticleInfo) {
  const canonicalUrl = isSafeWechatArticleUrl(articleInfo.article_url)
    ? normalizeWechatUrl(articleInfo.article_url)
    : result.url;

  return {
    ...result,
    url: canonicalUrl,
    articleHtml: articleInfo.html,
  };
}

async function enrichOneDeepDiveArticle(
  client: WxrankClient,
  result: SearchResult
): Promise<{ originalUrl: string; result: SearchResult }> {
  const originalUrl = result.url;
  const title = logText(result.title);
  const articleInfoStartedAt = Date.now();

  try {
    const articleInfo = await client.getArticleInfo(result.url);
    let enriched = applyArticleInfo(result, articleInfo);
    const commentId = articleInfo.comment_id?.toString().trim();
    log.info("wxrank", "artinfo completed", {
      event: "search.article_info.completed",
      endpoint: "artinfo",
      title,
      htmlChars: articleInfo.html.length,
      hasCommentId: Boolean(commentId),
      elapsedMs: Date.now() - articleInfoStartedAt,
    });

    if (commentId) {
      const commentsStartedAt = Date.now();
      try {
        const rawComments = await client.getArticleComments({
          url: enriched.url,
          commentId,
        });
        const comments = parseComments(rawComments);
        log.info("wxrank", "getcm completed", {
          event: "search.comments.completed",
          endpoint: "getcm",
          title,
          raw: rawComments.length,
          retained: comments.length,
          elapsedMs: Date.now() - commentsStartedAt,
        });
        if (comments.length > 0) {
          enriched = {
            ...enriched,
            comments,
          };
        }
      } catch (error) {
        log.warn("wxrank", "getcm failed; keeping article info", {
          event: "search.comments.failed",
          endpoint: "getcm",
          title,
          errorType: errorType(error),
          elapsedMs: Date.now() - commentsStartedAt,
        });
        return { originalUrl, result: enriched };
      }
    } else {
      log.debug("wxrank", "getcm skipped", {
        event: "search.comments.skipped",
        endpoint: "getcm",
        title,
        reason: "missing-comment-id",
      });
    }

    return { originalUrl, result: enriched };
  } catch (error) {
    log.warn("wxrank", "artinfo failed; keeping base result", {
      event: "search.article_info.failed",
      endpoint: "artinfo",
      title,
      errorType: errorType(error),
      elapsedMs: Date.now() - articleInfoStartedAt,
    });
    return { originalUrl, result };
  }
}

function replaceEnrichedResults(
  results: SearchResult[],
  replacements: Array<{ originalUrl: string; result: SearchResult }>
) {
  const replacementByOriginalUrl = new Map(
    replacements.map((item) => [item.originalUrl, item.result])
  );

  return results.map((result) => replacementByOriginalUrl.get(result.url) ?? result);
}

async function enrichDeepDiveArticles(
  client: WxrankClient,
  results: SearchResult[],
  onProgress?: ProgressReporter
) {
  const deepDiveLimit = getPositiveEnvInt(
    "WXRANK_DEEP_DIVE_LIMIT",
    DEFAULT_DEEP_DIVE_LIMIT
  );
  const candidates = selectDeepDiveArticles(results, deepDiveLimit);
  if (candidates.length === 0) {
    return results;
  }

  log.debug(
    "wxrank",
    "deep-dive selected",
    {
      event: "search.deep_dive.selected",
      selected: candidates.map((candidate, index) => ({
        rank: index + 1,
        title: logText(candidate.title),
        reasons: (candidate.qualitySignals?.reasons ?? []).map((reason) =>
          logText(reason, 80)
        ),
        stableScore: candidate.qualitySignals?.stableScore,
        anomalyScore: candidate.qualitySignals?.anomalyScore,
      })),
    }
  );

  onProgress?.({
    stepId: "deep_dive_started",
    label: "拆解标杆",
    detail: `深拆 ${candidates.length} 篇标杆文章`,
  });

  const replacements = [];
  for (const candidate of candidates) {
    replacements.push(await enrichOneDeepDiveArticle(client, candidate));
  }

  onProgress?.({
    stepId: "deep_dive_completed",
    label: "拆解标杆完成",
  });

  return dedupeByUrl(replaceEnrichedResults(results, replacements));
}

export function createWxrankSearchProvider(
  options: WxrankSearchProviderOptions = {}
): SearchProvider {
  return {
    async search(input: SearchQueryInput, onProgress?: ProgressReporter) {
      const client = options.client ?? createWxrankClient();
      const now = options.now?.() ?? new Date();
      const queryTerms = input.topicPlan
        ? {
            historyKeyword: input.topicPlan.historyKeyword,
            realtimeKeyword: input.topicPlan.realtimeKeyword,
            scoringTerms: [
              ...input.topicPlan.requiredTerms,
              ...input.topicPlan.relatedTerms,
            ],
          }
        : buildWxrankQueryTerms(input.query);
      const currentMonth = toMonthKey(now);
      const previousMonthKey = toMonthKey(previousMonth(now));
      const allHistoricalRaw: WxrankClientHistoricalArticle[] = [];
      let previousMonthRequested = false;
      let realtimeRequested = false;
      let realtimeQualified = 0;

      log.debug("wxrank", "topic search plan", {
        event: "search.plan.received",
        plan: input.topicPlan ?? queryTerms,
      });

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
      const currentHistoryStartedAt = Date.now();
      try {
        log.info("wxrank", "artlist", {
          event: "search.provider.started",
          endpoint: "artlist",
          month: currentMonth,
          keyword: logKeyword(queryTerms.historyKeyword),
        });
        currentHistory = await fetchHistoricalMonth(
          client,
          currentMonth,
          queryTerms.historyKeyword
        );
      } catch (error) {
        log.warn("wxrank", "artlist failed; stopping route", {
          event: "search.provider.failed",
          endpoint: "artlist",
          month: currentMonth,
          keyword: logKeyword(queryTerms.historyKeyword),
          reason: error instanceof Error ? error.message : "unknown error",
        });
        throw new WxrankProviderError();
      }
      if (currentHistory) {
        allHistoricalRaw.push(...currentHistory);
      }

      const currentQualified = currentHistory
        ? filterAndRankHistoricalArticles(
            currentHistory.map(toRankedHistoricalArticle),
            input.topicPlan ?? queryTerms.scoringTerms,
            now
          ).length
        : 0;
      log.info("wxrank", "artlist completed", {
        event: "search.provider.completed",
        endpoint: "artlist",
        month: currentMonth,
        raw: currentHistory?.length ?? 0,
        qualified: currentQualified,
        retained: currentQualified,
        rejected: Math.max(0, (currentHistory?.length ?? 0) - currentQualified),
        elapsedMs: Date.now() - currentHistoryStartedAt,
      });

      let rankedHistory = filterAndRankHistoricalArticles(
        allHistoricalRaw.map(toRankedHistoricalArticle),
        input.topicPlan ?? queryTerms.scoringTerms,
        now
      );

      if (rankedHistory.length < QUALIFIED_HISTORY_THRESHOLD) {
        previousMonthRequested = true;
        let previousHistory: WxrankClientHistoricalArticle[] | null;
        const previousHistoryStartedAt = Date.now();
        try {
          log.info("wxrank", "artlist", {
            event: "search.provider.started",
            endpoint: "artlist",
            month: previousMonthKey,
            keyword: logKeyword(queryTerms.historyKeyword),
          });
          previousHistory = await fetchHistoricalMonth(
            client,
            previousMonthKey,
            queryTerms.historyKeyword
          );
        } catch (error) {
          log.warn("wxrank", "artlist failed; stopping route", {
            event: "search.provider.failed",
            endpoint: "artlist",
            month: previousMonthKey,
            keyword: logKeyword(queryTerms.historyKeyword),
            reason: error instanceof Error ? error.message : "unknown error",
          });
          throw new WxrankProviderError();
        }
        if (previousHistory) {
          allHistoricalRaw.push(...previousHistory);
        }

        const previousQualified = previousHistory
          ? filterAndRankHistoricalArticles(
              previousHistory.map(toRankedHistoricalArticle),
              input.topicPlan ?? queryTerms.scoringTerms,
              now
            ).length
          : 0;
        log.info("wxrank", "artlist completed", {
          event: "search.provider.completed",
          endpoint: "artlist",
          month: previousMonthKey,
          raw: previousHistory?.length ?? 0,
          qualified: previousQualified,
          retained: previousQualified,
          rejected: Math.max(0, (previousHistory?.length ?? 0) - previousQualified),
          elapsedMs: Date.now() - previousHistoryStartedAt,
        });

        rankedHistory = filterAndRankHistoricalArticles(
          allHistoricalRaw.map(toRankedHistoricalArticle),
          input.topicPlan ?? queryTerms.scoringTerms,
          now
        );
      }

      const originalByUrl = buildOriginalArticleMap(allHistoricalRaw);
      let results = rankedHistory
        .map((article) => mapHistoricalResult(article, originalByUrl))
        .slice(0, RESULT_LIMIT);

      if (rankedHistory.length < QUALIFIED_HISTORY_THRESHOLD) {
        realtimeRequested = true;
        const realtimeStartedAt = Date.now();
        try {
          log.info("wxrank", "getso", {
            event: "search.provider.started",
            endpoint: "getso",
            keyword: logKeyword(queryTerms.realtimeKeyword || input.query),
          });
          const realtime = await client.searchArticles({
            keyword: queryTerms.realtimeKeyword || input.query,
            sortType: 4,
          });
          const rejectedReasons: Record<string, number> = {};
          const realtimeResults = realtime.flatMap((article) => {
            const result = mapRealtimeResult(article);
            if (!input.topicPlan) {
              return [result];
            }

            const evaluation = evaluateTopicPlanRelevance(
              result.title,
              result.snippet,
              input.topicPlan
            );
            if (evaluation.retained) {
              return [result];
            }

            incrementReason(
              rejectedReasons,
              evaluation.rejectionReason ?? "相关度不足"
            );
            return [];
          });
          realtimeQualified = realtimeResults.length;
          log.info("wxrank", "getso completed", {
            event: "search.provider.completed",
            endpoint: "getso",
            raw: realtime.length,
            qualified: realtimeQualified,
            retained: realtimeQualified,
            rejected: realtime.length - realtimeQualified,
            elapsedMs: Date.now() - realtimeStartedAt,
            rejectedReasons,
          });
          results = dedupeByUrl([
            ...results,
            ...realtimeResults,
          ]).slice(0, RESULT_LIMIT);
        } catch (error) {
          log.warn("wxrank", "getso failed; using available history", {
            event: "search.provider.failed",
            endpoint: "getso",
            keyword: logKeyword(queryTerms.realtimeKeyword || input.query),
            reason: error instanceof Error ? error.message : "unknown error",
          });
          if (results.length === 0) {
            throw new WxrankProviderError();
          }
        }
      }

      results = dedupeByUrl(results).slice(0, RESULT_LIMIT);
      if (results.length === 0) {
        throw new WxrankProviderError();
      }

      const route = realtimeRequested && realtimeQualified > 0
        ? rankedHistory.length > 0
          ? "mixed"
          : "realtime-fallback"
        : previousMonthRequested
          ? "history-extended"
          : "history-only";
      log.info("wxrank", `route=${route}`, {
        event: "search.route.selected",
        route,
        historyQualified: rankedHistory.length,
        realtimeQualified,
        final: results.length,
      });

      results.forEach((result, index) => {
        const origin = result.engagementMetrics ? "history" : "realtime";
        const evaluation = input.topicPlan
          ? evaluateTopicPlanRelevance(result.title, result.snippet, input.topicPlan)
          : null;
        const fallbackMatchedTerms = queryTerms.scoringTerms.filter((term) =>
          `${result.title}\n${result.snippet}`
            .toLocaleLowerCase()
            .includes(term.toLocaleLowerCase())
        );

        log.debug("wxrank", "retained result", {
          event: "search.retained_result",
          rank: index + 1,
          origin,
          title: logText(result.title),
          matchedTerms: evaluation?.matchedTerms ?? fallbackMatchedTerms,
          score: evaluation?.score ?? fallbackMatchedTerms.length,
          reasons: evaluation?.reasons ?? [
            origin === "history" ? "历史库相关性排序入选" : "实时搜索结果入选",
          ],
        });
      });

      emitProgress(onProgress, results);
      return enrichDeepDiveArticles(client, results, onProgress);
    },
  };
}

export const wxrankSearchProvider = createWxrankSearchProvider();
