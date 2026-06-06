import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkflowState } from "@/types/workflow";
import { WorkflowProvider } from "../workflow-context";
import { BriefStage } from "./brief-stage";
import { DraftStage } from "./draft-stage";
import { MetaStage } from "./meta-stage";
import { OutlineStage } from "./outline-stage";
import { TopicStage } from "./topic-stage";

vi.mock("@/lib/ai/client", () => ({
  generateTopics: vi.fn(),
  generateBrief: vi.fn(),
  generateOutline: vi.fn(),
  generateDraft: vi.fn(),
  generateTitlesAndSummaries: vi.fn(),
}));

function renderWithState(ui: React.ReactElement, state: Partial<WorkflowState>) {
  window.localStorage.setItem(
    "ai-writing-mvp-workflow",
    JSON.stringify(state)
  );
  return render(<WorkflowProvider>{ui}</WorkflowProvider>);
}

const topicSearchContext: WorkflowState["topicSearchContext"] = {
  status: "success",
  query: "AI 写作 痛点",
  intent: "topics",
  freshness: "pastMonth",
  results: [
    {
      title: "参考文章",
      snippet: "参考摘要",
      url: "https://mp.weixin.qq.com/s/example",
      source: "wechat",
    },
  ],
  seoKeywords: ["AI 写作"],
  crowdedness: "low",
  staleBuzzwords: [],
  notes: [],
};

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("search toggle placement", () => {
  it("does not render a reference toggle on the topic stage", async () => {
    renderWithState(<TopicStage />, {
      currentStep: "topic_select",
      topicOptions: [{
        id: "t1",
        title: "选题 1",
        label: "情绪共鸣视角",
        angle: "切入点 1",
        summary: "摘要 1",
        coreViewpoint: "观点 1",
        targetAudience: "读者 1",
        reason: "原因 1",
      }],
      searchSettings: {
        topics: true,
        brief: false,
        outline: false,
        meta: true,
      },
      topicSearchContext,
    });

    expect(await screen.findByText("选题会：选出最值得展开的切口")).toBeInTheDocument();
    expect(screen.queryByText("复用选题参考")).not.toBeInTheDocument();
  });

  it("does not show a disabled reference toggle when topics were generated without search context", async () => {
    renderWithState(<TopicStage />, {
      currentStep: "topic_select",
      topicOptions: [{
        id: "t1",
        title: "选题 1",
        label: "情绪共鸣视角",
        angle: "切入点 1",
        summary: "摘要 1",
        coreViewpoint: "观点 1",
        targetAudience: "读者 1",
        reason: "原因 1",
      }],
      searchSettings: {
        topics: false,
        brief: true,
        outline: false,
        meta: false,
      },
      topicSearchContext: null,
    });

    expect(await screen.findByText("选题会：选出最值得展开的切口")).toBeInTheDocument();
    expect(screen.queryByText("复用选题参考")).not.toBeInTheDocument();
    expect(screen.queryByText(/选题阶段没有联网搜索结果/i)).not.toBeInTheDocument();
  });

  it("does not render a reference toggle on the brief stage", async () => {
    renderWithState(<BriefStage />, {
      currentStep: "brief_confirm",
      topicOptions: [{
        id: "t1",
        title: "选题 1",
        label: "情绪共鸣视角",
        angle: "切入点 1",
        summary: "摘要 1",
        coreViewpoint: "观点 1",
        targetAudience: "读者 1",
        reason: "原因 1",
      }],
      selectedTopicId: "t1",
      brief: {
        objective: "目标",
        audience: "读者",
        persona: "人设",
        tone: "语气",
        dropOffPoint: "落脚点",
        constraints: ["约束"],
      },
      searchSettings: {
        topics: true,
        brief: false,
        outline: true,
        meta: true,
      },
      topicSearchContext,
    });

    expect(await screen.findByText("把策略单定稳")).toBeInTheDocument();
    expect(screen.queryByText("复用选题参考")).not.toBeInTheDocument();
  });

  it("does not render a search toggle on the outline stage", async () => {
    renderWithState(<OutlineStage />, {
      currentStep: "outline_review",
      outline: [
        {
          id: "section-1",
          heading: "标题",
          corePoint: "观点",
          supportSuggestion: "支撑",
          sectionRole: "角色",
        },
      ],
      materialSlots: [],
    });

    expect(await screen.findByText("结构审稿：先看骨架，再看素材")).toBeInTheDocument();
    expect(screen.queryByText("复用选题参考")).not.toBeInTheDocument();
  });

  it("does not render a reference toggle on the draft stage", async () => {
    renderWithState(<DraftStage />, {
      currentStep: "draft_review",
      draftVersions: [{ id: "d1", label: "版本一", content: "正文内容" }],
      selectedDraftVersionId: "d1",
      searchSettings: {
        topics: true,
        brief: false,
        outline: false,
        meta: true,
      },
      topicSearchContext,
    });

    expect(await screen.findByText("版本对读：挑出最像你的那一版")).toBeInTheDocument();
    expect(screen.queryByText("复用选题参考")).not.toBeInTheDocument();
  });

  it("does not render a search toggle on the meta stage", async () => {
    renderWithState(<MetaStage />, {
      currentStep: "meta_review",
      titleOptions: [{ id: "t1", label: "利益结果型", content: "标题" }],
      summaryOptions: [{ id: "s1", label: "痛点共鸣版", content: "摘要" }],
      finalSelection: {
        draftVersionId: null,
        titleId: "t1",
        summaryId: "s1",
      },
    });

    expect(await screen.findByText("包装定案：标题、摘要与封面表达")).toBeInTheDocument();
    expect(screen.queryByText("复用选题参考")).not.toBeInTheDocument();
  });
});
