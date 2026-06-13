import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkflowState } from "@/types/workflow";
import { WorkflowProvider } from "../workflow-context";
import { DraftStage } from "./draft-stage";

vi.mock("@/lib/ai/client", () => ({
  generateTopics: vi.fn(),
  generateBrief: vi.fn(),
  generateOutline: vi.fn(),
  generateDraft: vi.fn(),
  generateTitlesAndSummaries: vi.fn(),
}));

const draftState: Partial<WorkflowState> = {
  currentStep: "draft_review",
  draftVersions: [
    { id: "d1", label: "原稿", content: "这是原稿正文" },
    { id: "d2", label: "润色版", content: "这是润色版正文" },
  ],
  selectedDraftVersionId: "d1",
  draftFormattingByVersion: {},
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

describe("DraftStage", () => {
  it("renders draft versions as a horizontal tab row", async () => {
    renderWithState(<DraftStage />, draftState);

    expect(await screen.findByRole("button", { name: "原稿" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "润色版" })).toBeInTheDocument();
  });

  it("switches the displayed draft body when a version tab is selected", async () => {
    const user = userEvent.setup();
    renderWithState(<DraftStage />, draftState);

    await screen.findByText("这是原稿正文");
    await user.click(screen.getByRole("button", { name: "润色版" }));
    await waitFor(() => {
      expect(screen.getByText("这是润色版正文")).toBeInTheDocument();
    });
  });

  it("shows the formatting panel beside the body", async () => {
    renderWithState(<DraftStage />, draftState);

    expect(await screen.findByText("这是原稿正文")).toBeInTheDocument();
    expect(screen.getByTestId("wechat-format-panel")).toBeInTheDocument();
  });
});
