import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkflowState } from "@/types/workflow";
import { WorkflowProvider } from "../workflow-context";
import { OutlineStage } from "./outline-stage";

vi.mock("@/lib/ai/client", () => ({
  generateTopics: vi.fn(),
  generateBrief: vi.fn(),
  generateOutline: vi.fn(),
  generateDraft: vi.fn(),
  generateTitlesAndSummaries: vi.fn(),
}));

const outlineReviewState: Partial<WorkflowState> = {
  currentStep: "outline_review",
  selectedTopicId: "t1",
  brief: {
    objective: "讲清楚为什么 UI 标签要诚实",
    audience: "产品和内容创作者",
    persona: "清醒的产品编辑",
    tone: "直接、克制",
    dropOffPoint: "让读者知道下一步该看真实状态",
    constraints: [],
  },
  outline: [
    {
      id: "section-1",
      heading: "先把状态讲真",
      corePoint: "静态标签不能伪装成系统判断。",
      supportSuggestion: "用界面文案解释实际流程。",
      sectionRole: "开场判断",
    },
  ],
  materialSlots: [
    {
      id: "slot-1",
      targetOutlineId: "section-1",
      label: "产品原则",
      content: "不要给用户展示不存在的判定。",
      purpose: "支撑界面文案调整",
    },
  ],
};

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

function renderWithState(ui: React.ReactElement, state: Partial<WorkflowState>) {
  window.localStorage.setItem(
    "ai-writing-mvp-workflow",
    JSON.stringify(state)
  );
  return render(<WorkflowProvider>{ui}</WorkflowProvider>);
}

describe("OutlineStage", () => {
  it("shows node roles without a fixed continuable-writing label", async () => {
    renderWithState(<OutlineStage />, outlineReviewState);

    expect(await screen.findByText("节点角色：开场判断")).toBeInTheDocument();
    expect(screen.queryByText("继续可写")).not.toBeInTheDocument();
  });
});
