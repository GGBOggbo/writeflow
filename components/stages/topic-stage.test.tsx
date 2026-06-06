import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkflowState } from "@/types/workflow";
import { WorkflowProvider } from "../workflow-context";
import { TopicStage } from "./topic-stage";

vi.mock("@/lib/ai/client", () => ({
  generateTopics: vi.fn(),
  generateBrief: vi.fn(),
  generateOutline: vi.fn(),
  generateDraft: vi.fn(),
  generateTitlesAndSummaries: vi.fn(),
}));

const topicSelectState: Partial<WorkflowState> = {
  currentStep: "topic_select",
  ideaInput: "AI 写作工作流",
  topicOptions: [
    {
      id: "t1",
      title: "选题 1",
      label: "情绪共鸣视角",
      angle: "从成年人压力场景切入",
      summary: "这是旧摘要",
      coreViewpoint: "童年作品也能成为成年人的情绪识别入口。",
      targetAudience: "正在承受职场压力的成年人",
      reason: "怀旧情绪和心理学热点结合，容易引发收藏与转发。",
    },
    {
      id: "t2",
      title: "选题 2",
      label: "方法拆解视角",
      angle: "从写作工作流切入",
      summary: "这是旧摘要 2",
      coreViewpoint: "真正有效的 AI 写作不是代写，而是结构化协作。",
      targetAudience: "想提升内容效率的创作者",
      reason: "选题能兼顾实操价值和工具讨论热度。",
    },
  ],
  selectedTopicId: null,
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

describe("TopicStage", () => {
  it("renders topic cards from context state", async () => {
    renderWithState(<TopicStage />, topicSelectState);

    expect(await screen.findByText("选题 1")).toBeInTheDocument();
    expect(screen.getByText("选题 2")).toBeInTheDocument();
  });

  it("renders the correct number of topic buttons", async () => {
    renderWithState(<TopicStage />, topicSelectState);

    await waitFor(() => {
      const buttons = screen.getAllByRole("button", { name: /选择 /i });
      expect(buttons).toHaveLength(2);
    });
  });

  it("renders topic cards using the new semantic labels", async () => {
    renderWithState(<TopicStage />, topicSelectState);

    expect(await screen.findByText("情绪共鸣视角")).toBeInTheDocument();
    expect(screen.getByText("从成年人压力场景切入")).toBeInTheDocument();
    expect(
      screen.getByText("童年作品也能成为成年人的情绪识别入口。")
    ).toBeInTheDocument();
    expect(screen.getByText("正在承受职场压力的成年人")).toBeInTheDocument();
    expect(
      screen.getByText("怀旧情绪和心理学热点结合，容易引发收藏与转发。")
    ).toBeInTheDocument();
  });
});
