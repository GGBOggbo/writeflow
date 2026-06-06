import type { SearchProvider } from "./provider";
import type { SearchResult } from "./types";

function buildMockResults(query: string): SearchResult[] {
  return [
    {
      title: `${query}：最近用户最关心的3个问题`,
      snippet: `围绕 ${query} 的真实搜索表达、痛点词和情绪词，帮助模型快速抓到当下语境。`,
      url: "https://example.com/mock-search-1",
      source: "generic",
      engagementMetrics: {
        readCount: 12000,
        likeCount: 860,
        collectCount: 410,
        commentCount: 96,
      },
      seoKeywords: [query],
    },
    {
      title: `${query} 为什么最近又火了`,
      snippet: `聚焦 ${query} 的讨论热度、场景词和用户吐槽点，为选题和包装提供参考。`,
      url: "https://example.com/mock-search-2",
      source: "hotlist",
      engagementMetrics: {
        readCount: 8600,
        likeCount: 520,
        collectCount: 260,
        commentCount: 55,
      },
      seoKeywords: [query],
    },
  ];
}

export const mockSearchProvider: SearchProvider = {
  async search({ query }) {
    return buildMockResults(query);
  },
};
