import { describe, expect, it } from "vitest";
import { buildFormatDraftPrompt } from "./format-draft";

describe("buildFormatDraftPrompt", () => {
  it("asks for indexed semantic classifications without echoing block text", () => {
    const prompt = buildFormatDraftPrompt({
      draftVersionId: "draft-1",
      content: "第一段原文。\n\n这是核心判断。",
    });

    expect(prompt.userPrompt).toContain("第一段原文");
    expect(prompt.userPrompt).toContain("必须逐字保留");
    expect(prompt.userPrompt).toContain("不得改写");
    expect(prompt.userPrompt).toContain("不得输出 HTML");
    expect(prompt.userPrompt).toContain("不得输出 CSS");
    expect(prompt.userPrompt).toContain("[0] 第一段原文。");
    expect(prompt.userPrompt).toContain("[1] 这是核心判断。");
    expect(prompt.userPrompt).toContain("只返回每段的编号和类型");
    expect(prompt.userPrompt).not.toContain("所有 block.text 拼接");
    expect(prompt.userPrompt).toContain("paragraph");
    expect(prompt.userPrompt).toContain("heading");
    expect(prompt.userPrompt).toContain("quote");
    expect(prompt.userPrompt).toContain("pain");
    expect(prompt.userPrompt).toContain("transition");
    expect(prompt.userPrompt).toContain("list");
    expect(prompt.userPrompt).toContain("comparison");
    expect(prompt.userPrompt).toContain("cta");
  });

  it("includes quality feedback on retry without weakening text preservation", () => {
    const prompt = buildFormatDraftPrompt(
      {
        draftVersionId: "draft-1",
        content: "第一段。\n\n但问题是。\n\n这是核心判断。",
      },
      {
        qualityFeedback:
          "普通段落占比 98%，缺少 pain、transition，最长连续普通段落 80。",
      }
    );

    expect(prompt.userPrompt).toContain("上一次识别质量不足");
    expect(prompt.userPrompt).toContain("普通段落占比 98%");
    expect(prompt.userPrompt).toContain("不得改写");
    expect(prompt.userPrompt).toContain("不能添加原文不存在的标题");
  });

  it("emits reverse-boundary cues to curb paragraph over-classification", () => {
    const prompt = buildFormatDraftPrompt({
      draftVersionId: "draft-1",
      content: "第一段。\n\n第二段。",
    });

    // paragraph 反向自检(直打 98% paragraph 退化的核心)
    expect(prompt.userPrompt).toContain("反向自检");
    // 易混类型的反向边界
    expect(prompt.userPrompt).toContain("情绪爆点和反问不算金句");
    expect(prompt.userPrompt).toContain("作者立场不是痛点");
    expect(prompt.userPrompt).toContain("自然衔接不算 transition");
    expect(prompt.userPrompt).toContain("全文最多 1 个 cta");
  });
});
