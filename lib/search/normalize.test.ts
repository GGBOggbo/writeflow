import { describe, expect, it } from "vitest";
import { normalizeSearchResults } from "./normalize";
import type { SearchResult } from "./types";

function result(title: string, overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    title,
    snippet: "摘要",
    url: `https://example.com/${encodeURIComponent(title)}`,
    source: "wechat",
    ...overrides,
  };
}

describe("normalizeSearchResults", () => {
  it("keeps deep-dive articles ahead of raw absolute-traffic results", () => {
    const normalized = normalizeSearchResults([
      result("大号高阅读普通文章", {
        engagementMetrics: {
          readCount: 100001,
          likeCount: 1000,
          collectCount: 100,
          commentCount: 20,
        },
      }),
      result("核心深拆异常值", {
        articleHtml: "<p>正文</p>",
        qualitySignals: {
          stableScore: 100,
          anomalyScore: 180,
        },
        engagementMetrics: {
          readCount: 2000,
          likeCount: 160,
          collectCount: 96,
          commentCount: 32,
        },
      }),
    ]);

    expect(normalized[0]?.title).toBe("核心深拆异常值");
  });
});
