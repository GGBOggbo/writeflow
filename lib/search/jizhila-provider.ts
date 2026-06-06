import type { SearchProvider } from "./provider";
import type { ProgressReporter } from "@/lib/progress/types";
import {
  selectDeepDiveArticles,
  selectEngagementCandidates,
} from "./jizhila-selection";
import type {
  SearchArticleComment,
  SearchFreshness,
  SearchQueryInput,
  SearchResult,
  SearchSortType,
} from "./types";

const DEFAULT_BASE_URL = "https://www.dajiala.com";

type JizhilaSearchItem = {
  title?: string;
  desc?: string;
  doc_url?: string;
  timestamp?: number;
  date?: number;
  source?: {
    title?: string;
  };
};

type JizhilaSearchBox = {
  items?: JizhilaSearchItem[];
};

type JizhilaSearchResponse = {
  code?: number;
  msg?: string;
  data?: JizhilaSearchBox[];
};

type JizhilaReadZanResponse = {
  code?: number;
  msg?: string;
  data?: {
    read?: number;
    zan?: number;
    looking?: number;
    share_num?: number;
    collect_num?: number;
    comment_count?: number;
  };
};

type JizhilaArticleHtmlResponse = {
  code?: number;
  msg?: string;
  msk?: string;
  data?: {
    html?: string;
  };
};

type JizhilaCommentItem = {
  content?: string;
  like_num?: number;
  is_top?: number;
  create_time?: string;
};

type JizhilaArticleCommentResponse = {
  code?: number;
  msg?: string;
  data?: JizhilaCommentItem[];
};

function stripHtml(input?: string) {
  return (input ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function getPublishTimeType(freshness: SearchFreshness) {
  if (freshness === "pastDay") return 1;
  if (freshness === "pastWeek" || freshness === "pastMonth") return 2;
  if (freshness === "past6Months") return 3;
  return 0;
}

function getSortType(sortType: SearchSortType) {
  if (sortType === "hot") return 2;
  if (sortType === "latest") return 1;
  return 0;
}

function toPublishedAt(timestamp?: number) {
  if (!timestamp) return undefined;
  return new Date(timestamp * 1000).toISOString();
}

function parseResults(response: JizhilaSearchResponse): SearchResult[] {
  return (response.data ?? [])
    .flatMap((box) => box.items ?? [])
    .map((item) => ({
      title: stripHtml(item.title),
      snippet: stripHtml(item.desc),
      url: item.doc_url ?? "",
      publishedAt: toPublishedAt(item.timestamp ?? item.date),
      source: "wechat" as const,
      notes: item.source?.title ? [`公众号：${item.source.title}`] : undefined,
    }))
    .filter((result) => result.title && result.url);
}

function isEnabled(value?: string) {
  return value === "1" || value?.toLowerCase() === "true";
}

function toMetric(value?: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

async function enrichWithReadZan(
  result: SearchResult,
  baseUrl: string,
  apiKey: string,
  verifycode: string
): Promise<SearchResult> {
  const response = await fetch(`${baseUrl}/fbmain/monitor/v3/read_zan_pro`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: result.url,
      key: apiKey,
      verifycode,
    }),
  });

  if (!response.ok) {
    return result;
  }

  const json = (await response.json()) as JizhilaReadZanResponse;

  if (json.code !== 0 || !json.data) {
    return result;
  }

  return {
    ...result,
    engagementMetrics: {
      readCount: toMetric(json.data.read),
      likeCount: toMetric(json.data.zan),
      lookingCount: toMetric(json.data.looking),
      shareCount: toMetric(json.data.share_num),
      collectCount: toMetric(json.data.collect_num),
      commentCount: toMetric(json.data.comment_count),
    },
  };
}

async function enrichWithArticleHtml(
  result: SearchResult,
  baseUrl: string,
  apiKey: string,
  verifycode: string
): Promise<SearchResult> {
  const response = await fetch(`${baseUrl}/fbmain/monitor/v3/article_html`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: result.url,
      key: apiKey,
      verifycode,
    }),
  });

  if (!response.ok) {
    return result;
  }

  const json = (await response.json()) as JizhilaArticleHtmlResponse;

  if (json.code !== 0 || !json.data?.html) {
    return result;
  }

  return {
    ...result,
    articleHtml: json.data.html,
  };
}

function parseComment(item: JizhilaCommentItem): SearchArticleComment | null {
  const content = stripHtml(item.content);
  if (!content) return null;

  return {
    content,
    likeCount: toMetric(item.like_num),
    isTop: item.is_top === 1,
    createdAt: item.create_time,
  };
}

async function enrichWithComments(
  result: SearchResult,
  baseUrl: string,
  apiKey: string,
  verifycode: string
): Promise<SearchResult> {
  const response = await fetch(`${baseUrl}/fbmain/monitor/v3/article_comment2`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: result.url,
      buffer: "",
      key: apiKey,
      verifycode,
    }),
  });

  if (!response.ok) {
    return result;
  }

  const json = (await response.json()) as JizhilaArticleCommentResponse;

  if (json.code !== 0 || !json.data) {
    return result;
  }

  const topN = Number.parseInt(process.env.JIZHILA_ENRICH_COMMENT_TOP_N ?? "10", 10);
  const commentLimit = Number.isFinite(topN) && topN > 0 ? topN : 10;
  const comments = json.data
    .map(parseComment)
    .filter((comment): comment is SearchArticleComment => Boolean(comment))
    .sort((left, right) => {
      if (left.isTop !== right.isTop) return left.isTop ? -1 : 1;
      return (right.likeCount ?? 0) - (left.likeCount ?? 0);
    })
    .slice(0, commentLimit);

  return comments.length > 0
    ? {
        ...result,
        comments,
      }
    : result;
}

function replaceResults(results: SearchResult[], replacements: SearchResult[]) {
  const replacementByUrl = new Map(replacements.map((result) => [result.url, result]));
  const replaced = results.map((result) => replacementByUrl.get(result.url) ?? result);
  const replacementUrls = new Set(replacements.map((result) => result.url));

  return [
    ...replacements,
    ...replaced.filter((result) => !replacementUrls.has(result.url)),
  ];
}

function getPositiveEnvInt(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

async function enrichResults(
  results: SearchResult[],
  baseUrl: string,
  apiKey: string,
  verifycode: string,
  onProgress?: ProgressReporter
) {
  if (!isEnabled(process.env.JIZHILA_ENRICH_READ_ZAN?.trim())) {
    return results;
  }

  const enrichLimit = getPositiveEnvInt("JIZHILA_ENRICH_LIMIT", 3);
  const candidates = selectEngagementCandidates(results, enrichLimit);
  const candidateUrls = new Set(candidates.map((result) => result.url));
  const tail = results.filter((result) => !candidateUrls.has(result.url));

  onProgress?.({
    stepId: "engagement_enrichment_started",
    label: "5 篇互动验证",
    detail: `准备验证 ${candidates.length} 篇文章`,
  });

  const enriched = await Promise.all(
    candidates.map(async (result) => {
      try {
        return await enrichWithReadZan(result, baseUrl, apiKey, verifycode);
      } catch {
        return result;
      }
    })
  );

  onProgress?.({
    stepId: "engagement_enrichment_completed",
    label: "5 篇互动验证完成",
    detail: `已验证 ${enriched.length} 篇文章`,
  });

  let nextResults = [...enriched, ...tail];

  if (!isEnabled(process.env.JIZHILA_ENRICH_ARTICLE_HTML?.trim())) {
    return nextResults;
  }

  const articleLimit = getPositiveEnvInt("JIZHILA_ENRICH_ARTICLE_LIMIT", 2);
  const deepDiveCandidates = selectDeepDiveArticles(enriched, articleLimit);
  onProgress?.({
    stepId: "deep_dive_started",
    label: "2 篇深拆",
    detail: `准备深拆 ${deepDiveCandidates.length} 篇文章`,
  });
  const withHtml = await Promise.all(
    deepDiveCandidates.map(async (result) => {
      try {
        return await enrichWithArticleHtml(result, baseUrl, apiKey, verifycode);
      } catch {
        return result;
      }
    })
  );

  let deepDiveResults = withHtml;

  if (isEnabled(process.env.JIZHILA_ENRICH_COMMENTS?.trim())) {
    const commentLimit = getPositiveEnvInt("JIZHILA_ENRICH_COMMENT_LIMIT", 2);
    const commentCandidates = withHtml
      .filter((result) => (result.engagementMetrics?.commentCount ?? 0) > 0)
      .slice(0, commentLimit);
    const commentUrls = new Set(commentCandidates.map((result) => result.url));
    const withComments = await Promise.all(
      commentCandidates.map(async (result) => {
        try {
          return await enrichWithComments(result, baseUrl, apiKey, verifycode);
        } catch {
          return result;
        }
      })
    );

    deepDiveResults = withHtml.map((result) => {
      if (!commentUrls.has(result.url)) return result;
      return withComments.find((item) => item.url === result.url) ?? result;
    });
  }

  nextResults = replaceResults(nextResults, deepDiveResults);

  onProgress?.({
    stepId: "deep_dive_completed",
    label: "2 篇深拆完成",
    detail: `已完成 ${deepDiveResults.length} 篇核心对标文`,
  });

  return nextResults;
}

export const jizhilaSearchProvider: SearchProvider = {
  async search(input: SearchQueryInput, onProgress?: ProgressReporter) {
    const apiKey = process.env.JIZHILA_API_KEY?.trim();

    if (!apiKey) {
      throw new Error("JIZHILA_API_KEY 未配置。");
    }

    const baseUrl = process.env.JIZHILA_BASE_URL?.trim() || DEFAULT_BASE_URL;
    const verifycode = process.env.JIZHILA_VERIFY_CODE?.trim() ?? "";
    onProgress?.({
      stepId: "web_search_started",
      label: "微信搜一搜",
      detail: input.query,
    });

    const response = await fetch(`${baseUrl}/fbmain/monitor/v3/web_search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: 1,
        keyword: input.query,
        search_type: 1,
        publish_time_type: getPublishTimeType(input.freshness),
        sort_type: getSortType(input.sortType),
        currentPage: 1,
        offset: 0,
        cookies_buffer: "",
        key: apiKey,
        verifycode,
      }),
    });

    if (!response.ok) {
      throw new Error(`极致了搜索请求失败（${response.status}）`);
    }

    const json = (await response.json()) as JizhilaSearchResponse;

    if (json.code !== 0) {
      throw new Error(json.msg ?? `极致了搜索失败（${json.code ?? "unknown"}）`);
    }

    onProgress?.({
      stepId: "web_search_completed",
      label: "微信搜一搜完成",
      detail: "已收到公众号文章列表",
    });

    const results = parseResults(json).slice(0, 8);
    onProgress?.({
      stepId: "results_normalized",
      label: "8 篇建档",
      detail: `保留 ${results.length} 篇参考文章`,
    });

    return enrichResults(results, baseUrl, apiKey, verifycode, onProgress);
  },
};
