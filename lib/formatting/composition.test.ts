import { describe, expect, it } from "vitest";
import { composeFormattingBlocks } from "./composition";

describe("composeFormattingBlocks", () => {
  it("groups adjacent short narrative paragraphs without changing their text", () => {
    const blocks = composeFormattingBlocks([
      { id: "1", type: "paragraph", text: "菜单灰的。" },
      { id: "2", type: "paragraph", text: "点不动。" },
      { id: "3", type: "paragraph", text: "我以为网卡了，刷新。" },
      { id: "4", type: "paragraph", text: "还是灰的。" },
    ]);

    expect(blocks).toEqual([
      {
        id: "1",
        type: "paragraph",
        text: "菜单灰的。\n\n点不动。\n\n我以为网卡了，刷新。\n\n还是灰的。",
      },
    ]);
  });

  it("keeps semantic emphasis blocks as hard boundaries", () => {
    const blocks = composeFormattingBlocks([
      { id: "1", type: "paragraph", text: "我刷新了页面。" },
      { id: "2", type: "quote", text: "钱刚走，门就关了。" },
      { id: "3", type: "paragraph", text: "我又退出重新登录。" },
      { id: "4", type: "paragraph", text: "结果还是一样。" },
      { id: "5", type: "cta", text: "你遇到过吗？" },
    ]);

    expect(blocks.map((block) => block.type)).toEqual([
      "paragraph",
      "quote",
      "paragraph",
      "cta",
    ]);
    expect(blocks[2]?.text).toBe("我又退出重新登录。\n\n结果还是一样。");
  });

  it("does not build oversized narrative paragraphs", () => {
    const sentence = "这是一段长度接近限制的普通叙述，用来确保合并后的自然段不会变成新的文字墙。";
    const blocks = composeFormattingBlocks(
      Array.from({ length: 8 }, (_, index) => ({
        id: String(index),
        type: "paragraph" as const,
        text: sentence,
      }))
    );

    expect(blocks.length).toBeGreaterThan(1);
    expect(blocks.every((block) => block.text.length <= 180)).toBe(true);
  });
});
