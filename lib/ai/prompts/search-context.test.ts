import { describe, expect, it } from "vitest";
import { formatSearchReference } from "./search-context";

describe("formatSearchReference", () => {
  it("includes deep-dive article excerpts and top comments when available", () => {
    const reference = formatSearchReference(
      {
        title: "我用 n8n 自动化接单，踩坑后才明白这件事",
        snippet: "普通人真实复盘。",
        url: "https://mp.weixin.qq.com/s/stable",
        publishedAt: "2026-06-01T08:00:00.000Z",
        source: "wechat",
        notes: ["公众号：自动化实战笔记"],
        seoKeywords: ["n8n 自动化", "普通人接单"],
        crowdedness: "medium",
        staleBuzzwords: ["底层逻辑"],
        articleHtml: "<p>第一段很短。</p><p><strong>这里是加粗金句。</strong></p>",
        comments: [
          { content: "真正卡住我的不是工具，是不知道怎么开始。", likeCount: 90 },
        ],
        qualitySignals: {
          reasons: ["个人视角", "细分场景"],
        },
      },
      0
    );

    expect(reference).toContain("链接：https://mp.weixin.qq.com/s/stable");
    expect(reference).toContain("发布时间：2026-06-01T08:00:00.000Z");
    expect(reference).toContain("来源备注：公众号：自动化实战笔记");
    expect(reference).toContain("单篇关键词：n8n 自动化、普通人接单");
    expect(reference).toContain("拥挤度：medium");
    expect(reference).toContain("疲劳词：底层逻辑");
    expect(reference).toContain("深拆理由：个人视角、细分场景");
    expect(reference).toContain("正文节奏样本：开头：第一段很短。");
    expect(reference).toContain("这里是加粗金句。");
    expect(reference).toContain("排版信号：共 2 段");
    expect(reference).toContain("高赞评论：真正卡住我的不是工具，是不知道怎么开始。");
  });

  it("extracts article rhythm from representative blocks instead of hard-cutting the opening", () => {
    const longOpening = "开头铺垫".repeat(80);
    const reference = formatSearchReference(
      {
        title: "普通人做公众号，真正卡住的是这一步",
        snippet: "不是工具问题。",
        url: "https://mp.weixin.qq.com/s/rhythm",
        source: "wechat",
        articleHtml: [
          `<p>${longOpening}</p>`,
          "<p>很多人以为是不会写，其实是没人告诉你第一步怎么做。</p>",
          "<p><strong>真正的卡点不是写作，而是不知道怎么开始。</strong></p>",
          "<p>最后你会发现，先写一个真实场景，比憋一个宏大观点更重要。</p>",
        ].join(""),
      },
      0
    );

    expect(reference).toContain("正文节奏样本：");
    expect(reference).toContain("开头：开头铺垫");
    expect(reference).toContain("痛点/判断：很多人以为是不会写");
    expect(reference).toContain("加粗金句：真正的卡点不是写作，而是不知道怎么开始。");
    expect(reference).toContain("结尾：最后你会发现");
    expect(reference).toContain("排版信号：");
  });
});
