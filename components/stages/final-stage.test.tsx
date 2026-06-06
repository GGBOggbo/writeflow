import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkflowState } from "@/types/workflow";
import { WorkflowProvider } from "../workflow-context";
import { ManuscriptPanel } from "../manuscript-panel";

vi.mock("@/lib/ai/client", () => ({
  generateTopics: vi.fn(),
  generateBrief: vi.fn(),
  generateOutline: vi.fn(),
  generateDraft: vi.fn(),
  generateTitlesAndSummaries: vi.fn(),
}));

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

const finalizeState: Partial<WorkflowState> = {
  currentStep: "finalize",
  ideaInput: "AI 写作",
  topicOptions: [{
    id: "t1",
    title: "选题 1",
    label: "情绪共鸣视角",
    angle: "切入",
    summary: "摘要",
    coreViewpoint: "观点",
    targetAudience: "读者",
    reason: "原因",
  }],
  selectedTopicId: "t1",
  brief: {
    objective: "目标",
    audience: "读者",
    persona: "人设",
    tone: "语气",
    dropOffPoint: "落脚点",
    constraints: ["约束1"],
  },
  outline: [{ id: "s1", heading: "开头", corePoint: "核心", supportSuggestion: "建议", sectionRole: "引入", notes: "备注" }],
  materialSlots: [
    {
      id: "m1",
      targetOutlineId: "s1",
      label: "素材",
      content: "内容",
      placement: "正文",
      purpose: "支撑",
    },
  ],
  draftVersions: [
    { id: "draft-1", label: "版本 A", content: "正文 A" },
    { id: "draft-2", label: "版本 B", content: "正文 B" },
  ],
  selectedDraftVersionId: "draft-1",
  titleOptions: [
    { id: "title-1", label: "标题方案 A", content: "标题 A" },
    { id: "title-2", label: "标题方案 B", content: "标题 B" },
  ],
  summaryOptions: [
    { id: "summary-1", label: "摘要方案 A", content: "摘要 A" },
    { id: "summary-2", label: "摘要方案 B", content: "摘要 B" },
  ],
  finalSelection: {
    draftVersionId: null,
    titleId: "title-1",
    summaryId: "summary-1",
  },
};

function renderWithState(ui: React.ReactElement, state: Partial<WorkflowState>) {
  window.localStorage.setItem(
    "ai-writing-mvp-workflow",
    JSON.stringify(state)
  );
  return render(<WorkflowProvider>{ui}</WorkflowProvider>);
}

describe("FinalStage", () => {
  it("renders draft versions and titles from context", async () => {
    renderWithState(<ManuscriptPanel />, finalizeState);

    expect(await screen.findByText("版本 A")).toBeInTheDocument();
    expect(screen.getByText("版本 B")).toBeInTheDocument();
    expect(screen.getByText("标题 A")).toBeInTheDocument();
  });

  it("lets the user go back to the title and summary step", async () => {
    const user = userEvent.setup();
    renderWithState(<ManuscriptPanel />, finalizeState);

    await screen.findByText("版本 A");
    await user.click(screen.getByRole("button", { name: /返回标题摘要/i }));

    expect(await screen.findByText(/包装定案：标题、摘要与封面表达/i)).toBeInTheDocument();
  });
});
