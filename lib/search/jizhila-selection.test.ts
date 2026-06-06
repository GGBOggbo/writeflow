import { describe, expect, it } from "vitest";
import {
  selectDeepDiveArticles,
  selectEngagementCandidates,
} from "./jizhila-selection";
import type { SearchResult } from "./types";

function article(
  title: string,
  overrides: Partial<SearchResult> = {}
): SearchResult {
  return {
    title,
    snippet: overrides.snippet ?? "普通人真实复盘，讲清楚具体场景和踩坑。",
    url: overrides.url ?? `https://mp.weixin.qq.com/s/${encodeURIComponent(title)}`,
    source: "wechat",
    notes: overrides.notes,
    engagementMetrics: overrides.engagementMetrics,
    publishedAt: overrides.publishedAt,
  };
}

describe("Jizhila article selection", () => {
  it("keeps concrete trend-opportunity articles while filtering official broad narratives", () => {
    const results = [
      article("人民日报重磅发布行业趋势白皮书", {
        notes: ["公众号：人民日报"],
        snippet: "宏观报告、公报、行业趋势。",
      }),
      article("n8n 史诗级更新：普通人做 AI 工作流的新机会来了", {
        notes: ["公众号：自动化实战手记"],
        snippet: "具体工具更新，讲普通人怎么抓住红利。",
      }),
      article("普通人用 AI 写公众号，为什么做了30天还是没人看"),
      article("我做副业踩过的 5 个坑，新手别再浪费钱了"),
      article("宝妈在家做内容，真正卡住的是没时间"),
      article("AI 智能体教程：从 0 搭一个获客流程"),
      article("协会发布年度观察报告", {
        notes: ["公众号：中国行业协会"],
      }),
      article("小团队用 Claude 写代码的真实复盘"),
    ];

    const selected = selectEngagementCandidates(results, 5);

    expect(selected.map((item) => item.title)).toContain(
      "n8n 史诗级更新：普通人做 AI 工作流的新机会来了"
    );
    expect(selected.map((item) => item.title)).not.toContain(
      "人民日报重磅发布行业趋势白皮书"
    );
    expect(selected).toHaveLength(5);
  });

  it("uses interaction rates to promote small-account resonance over big-account traffic", () => {
    const selected = selectDeepDiveArticles(
      [
        article("百万大号：AI 行业趋势全景解读", {
          notes: ["公众号：官方研究院"],
          engagementMetrics: {
            readCount: 100001,
            likeCount: 100,
            collectCount: 50,
            commentCount: 20,
          },
        }),
        article("普通人用 AI 做副业，为什么第7天就放弃", {
          notes: ["公众号：一个人的工作流"],
          engagementMetrics: {
            readCount: 2000,
            likeCount: 160,
            collectCount: 96,
            commentCount: 32,
          },
        }),
        article("新手做公众号没人看，我复盘了这3个坑", {
          engagementMetrics: {
            readCount: 8000,
            likeCount: 520,
            collectCount: 260,
            commentCount: 48,
          },
        }),
        article("重磅：2026 内容行业白皮书", {
          notes: ["公众号：行业协会"],
          engagementMetrics: {
            readCount: 90000,
            likeCount: 300,
            collectCount: 120,
            commentCount: 8,
          },
        }),
        article("我用 n8n 自动化接单，踩坑后才明白这件事", {
          engagementMetrics: {
            readCount: 12000,
            likeCount: 720,
            collectCount: 410,
            commentCount: 66,
          },
        }),
      ],
      2
    );

    expect(selected.map((item) => item.title)).toEqual([
      "我用 n8n 自动化接单，踩坑后才明白这件事",
      "普通人用 AI 做副业，为什么第7天就放弃",
    ]);
  });
});
