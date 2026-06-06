import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkflowStatus } from "./workflow-status";

const mockUseWorkflowContext = vi.fn();

vi.mock("./workflow-context", () => ({
  useWorkflowContext: () => mockUseWorkflowContext(),
}));

describe("WorkflowStatus loading guard", () => {
  it("disables backward navigation while generation is in progress", () => {
    mockUseWorkflowContext.mockReturnValue({
      state: {
        currentStep: "topic_select",
        ideaInput: "AI 写作工作流",
        topicOptions: [
          {
            id: "t1",
            title: "选题 1",
            label: "情绪共鸣视角",
            angle: "切入点 1",
            summary: "摘要 1",
            coreViewpoint: "观点 1",
            targetAudience: "读者 1",
            reason: "原因 1",
          },
        ],
        selectedTopicId: null,
        brief: null,
        outline: [],
        materialSlots: [],
        draftVersions: [],
        selectedDraftVersionId: null,
        titleOptions: [],
        summaryOptions: [],
        finalSelection: {
          draftVersionId: null,
          titleId: null,
          summaryId: null,
        },
      },
      loading: true,
      handleGoToStep: vi.fn(),
    });

    render(<WorkflowStatus />);

    expect(screen.queryByRole("button", { name: /想法/i })).not.toBeInTheDocument();
    expect(screen.getByText("想法")).toBeInTheDocument();
  });
});
