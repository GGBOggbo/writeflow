import { describe, expect, it } from "vitest";
import { createInitialWorkflowState, transitionWorkflow } from "./state-machine";

describe("workflow final selection defaults", () => {
  it("stores the first generated title and summary as default final selection", () => {
    const state = createInitialWorkflowState();

    const next = transitionWorkflow(state, {
      type: "meta_generated",
      titles: [
        { id: "title-1", label: "利益结果型", content: "标题 A" },
        { id: "title-2", label: "场景痛点型", content: "标题 B" },
        { id: "title-3", label: "反常识/认知冲突型", content: "标题 C" },
        { id: "title-4", label: "新机会趋势型", content: "标题 D" },
        { id: "title-5", label: "个人故事/实录型", content: "标题 E" },
      ],
      summaries: [
        { id: "summary-1", label: "痛点共鸣版", content: "摘要 A" },
        { id: "summary-2", label: "悬念反转版", content: "摘要 B" },
        { id: "summary-3", label: "专业克制版", content: "摘要 C" },
      ],
      coverSuggestion: "取材建议",
      coverImagePrompt: "【公众号封面 · 900×383】画面概念：清晨办公室",
    });

    expect(next.finalSelection.titleId).toBe("title-1");
    expect(next.finalSelection.summaryId).toBe("summary-1");
  });
});
