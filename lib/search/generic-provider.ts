import { log } from "@/lib/debug";
import type { SearchProvider } from "./provider";
import type { SearchFreshness, SearchQueryInput, SearchSource, SearchResult } from "./types";

/**
 * Map project-level freshness semantics to Bocha API values.
 *
 * Bocha supports: noLimit, oneDay, oneWeek, oneMonth, oneYear, YYYY-MM-DD..YYYY-MM-DD
 * The project uses: noLimit, pastDay, pastWeek, pastMonth, past6Months
 *
 * "past6Months" has no direct Bocha equivalent, so we compute a date range.
 */
function toBochaFreshness(freshness: SearchFreshness): string {
  if (freshness === "noLimit") return "noLimit";
  if (freshness === "pastDay") return "oneDay";
  if (freshness === "pastWeek") return "oneWeek";
  if (freshness === "pastMonth") return "oneMonth";

  // past6Months → date range from 6 months ago to today
  const now = new Date();
  const from = new Date(now);
  from.setMonth(from.getMonth() - 6);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return `${fmt(from)}..${fmt(now)}`;
}

// ---------------------------------------------------------------------------
// Bocha (博查) Web Search API
// https://open.bochaai.com/
// ---------------------------------------------------------------------------

type BochaWebPage = {
  name: string;
  url: string;
  snippet?: string;
  summary?: string;
  siteName?: string;
  datePublished?: string;
};

type BochaSearchResponse = {
  code?: number;
  data?: {
    _type?: string;
    webPages?: {
      value?: BochaWebPage[];
    };
  };
  /** Fallback: some endpoints return webPages at top level. */
  webPages?: {
    value?: BochaWebPage[];
  };
};

function inferSearchSource(siteName?: string): SearchSource {
  if (!siteName) return "generic";
  const lower = siteName.toLowerCase();
  if (lower.includes("微信") || lower.includes("weixin")) return "wechat";
  if (lower.includes("小红书") || lower.includes("xiaohongshu")) return "xiaohongshu";
  return "generic";
}

function parseBochaResults(response: BochaSearchResponse): SearchResult[] {
  const pages = response.data?.webPages?.value ?? response.webPages?.value ?? [];

  return pages.slice(0, 8).map((page) => ({
    title: page.name,
    snippet:
      page.summary && page.summary.length > (page.snippet?.length ?? 0)
        ? page.summary
        : (page.snippet ?? ""),
    url: page.url,
    publishedAt: page.datePublished,
    source: inferSearchSource(page.siteName),
  }));
}

export const genericSearchProvider: SearchProvider = {
  async search({ query, freshness }: SearchQueryInput) {
    const apiKey = process.env.BOCHA_API_KEY?.trim();

    if (!apiKey) {
      throw new Error("BOCHA_API_KEY 未配置。请在 .env.local 中设置 BOCHA_API_KEY。");
    }

    const bochaFreshness = toBochaFreshness(freshness);
    const body = JSON.stringify({
      query,
      freshness: bochaFreshness,
      summary: true,
      count: 8,
    });

    log.info("search", `→ bocha | query="${query}" freshness="${bochaFreshness}"`, {
      event: "search.provider.started",
      provider: "bocha",
      endpoint: "web-search",
      freshness: bochaFreshness,
    });
    const t0 = Date.now();

    const response = await fetch("https://api.bochaai.com/v1/web-search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`博查搜索请求失败（${response.status}）`);
    }

    const json = (await response.json()) as BochaSearchResponse;
    log.debug("search", "bocha 原始响应", {
      event: "search.provider.raw_summary",
      provider: "bocha",
      endpoint: "web-search",
      pages: json.webPages?.value?.map((p) => ({
        name: p.name,
        siteName: p.siteName,
        datePublished: p.datePublished,
        snippetLen: (p.summary ?? p.snippet ?? "").length,
      })),
    });

    const results = parseBochaResults(json);

    log.info("search", `← bocha | results=${results.length} ${Date.now() - t0}ms`, {
      event: "search.provider.completed",
      provider: "bocha",
      endpoint: "web-search",
      results: results.length,
      elapsedMs: Date.now() - t0,
    });

    return results;
  },
};
