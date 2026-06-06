import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { WorkflowState } from "@/types/workflow";
import { WorkflowProvider } from "./workflow-context";
import { WorkflowStatus } from "./workflow-status";

beforeEach(() => {
  window.localStorage.clear();
});

function renderWithState(state: Partial<WorkflowState>) {
  window.localStorage.setItem(
    "ai-writing-mvp-workflow",
    JSON.stringify(state)
  );

  return render(
    <WorkflowProvider>
      <WorkflowStatus />
    </WorkflowProvider>
  );
}

describe("WorkflowStatus", () => {
  it("does not unlock outline before the outline is actually generated", async () => {
    renderWithState({
      currentStep: "brief_confirm",
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
      selectedTopicId: "t1",
      brief: {
        objective: "目标",
        audience: "读者",
        persona: "人设",
        tone: "语气",
        dropOffPoint: "落脚点",
        constraints: ["约束"],
      },
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
    });

    expect(await screen.findByRole("button", { name: /想法/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /选题/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /大纲/i })).not.toBeInTheDocument();
  });

  it("allows going back to idea when current step is topic_select", async () => {
    renderWithState({
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
    });

    expect(await screen.findByRole("button", { name: /想法/i })).toBeInTheDocument();
  });

  it("keeps topic step clickable after returning to idea when topics already exist", async () => {
    renderWithState({
      currentStep: "idea_input",
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
    });

    expect(
      await screen.findByRole("button", { name: /选题/i })
    ).toBeInTheDocument();
  });
});
