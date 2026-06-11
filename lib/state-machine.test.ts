import { describe, expect, it } from "vitest";
import { createInitialWorkflowState, transitionWorkflow } from "./state-machine";
import type { WorkflowState } from "@/types/workflow";

describe("workflow state machine", () => {
  it("defaults structure type and lets the brief stage update it", () => {
    const state = createInitialWorkflowState();

    expect(state.structureType).toBe("痛点拆解型");

    const next = transitionWorkflow(state, {
      type: "structure_type_updated",
      structureType: "故事案例型",
    });

    expect(next.structureType).toBe("故事案例型");
    expect(next.currentStep).toBe("idea_input");
  });

  it("starts with network search disabled while Bocha is paused", () => {
    const state = createInitialWorkflowState();

    expect(state.searchSettings).toEqual({
      topics: false,
      brief: false,
      outline: false,
      meta: false,
    });
  });

  it("advances from idea input to topic select after topics load", () => {
    const state = createInitialWorkflowState();
    const searchContext = {
      status: "success" as const,
      query: "AI 写作 痛点",
      intent: "topics" as const,
      freshness: "past6Months" as const,
      results: [
        {
          title: "搜索文章",
          snippet: "搜索摘要",
          url: "https://mp.weixin.qq.com/s/topic",
          source: "wechat" as const,
        },
      ],
      seoKeywords: ["AI 写作"],
      crowdedness: "low" as const,
      staleBuzzwords: [],
      notes: [],
    };

    const next = transitionWorkflow(state, {
      type: "topics_generated",
      searchContext,
      topics: [
        {
          id: "t1",
          title: "Topic 1",
          angle: "Angle 1",
          summary: "Summary 1",
        },
      ],
    });

    expect(next.currentStep).toBe("topic_select");
    expect(next.topicOptions).toHaveLength(1);
    expect(next.topicSearchContext).toEqual(searchContext);
  });

  it("resets downstream workflow data when topics are regenerated", () => {
    const state: WorkflowState = {
      ...createInitialWorkflowState(),
      currentStep: "finalize",
      structureType: "故事案例型",
      ideaInput: "AI 写作工作流",
      topicOptions: [{ id: "old-topic", title: "旧选题", angle: "旧角度", summary: "旧摘要" }],
      selectedTopicId: "old-topic",
      brief: {
        objective: "旧目标",
        audience: "旧读者",
        persona: "旧人设",
        tone: "旧语气",
        dropOffPoint: "旧落脚点",
        constraints: ["旧约束"],
      },
      outline: [
        {
          id: "section-1",
          heading: "旧大纲",
          corePoint: "旧观点",
          supportSuggestion: "旧支撑",
          sectionRole: "正文模块",
        },
      ],
      materialSlots: [
        {
          id: "slot-1",
          targetOutlineId: "section-1",
          label: "旧槽位",
          content: "旧内容",
          placement: "正文核心案例",
          purpose: "旧用途",
        },
      ],
      draftVersions: [{ id: "draft-1", label: "旧稿", content: "旧正文" }],
      selectedDraftVersionId: "draft-1",
      titleOptions: [{ id: "title-1", label: "旧标题", content: "旧标题内容" }],
      summaryOptions: [{ id: "summary-1", label: "旧摘要", content: "旧摘要内容" }],
      finalSelection: {
        draftVersionId: "draft-1",
        titleId: "title-1",
        summaryId: "summary-1",
      },
    };

    const next = transitionWorkflow(state, {
      type: "topics_generated",
      topics: [
        {
          id: "new-topic",
          title: "新选题",
          angle: "新角度",
          summary: "新摘要",
        },
      ],
    });

    expect(next.currentStep).toBe("topic_select");
    expect(next.structureType).toBe("痛点拆解型");
    expect(next.topicOptions).toEqual([
      {
        id: "new-topic",
        title: "新选题",
        angle: "新角度",
        summary: "新摘要",
      },
    ]);
    expect(next.selectedTopicId).toBeNull();
    expect(next.brief).toBeNull();
    expect(next.outline).toEqual([]);
    expect(next.materialSlots).toEqual([]);
    expect(next.draftVersions).toEqual([]);
    expect(next.selectedDraftVersionId).toBeNull();
    expect(next.titleOptions).toEqual([]);
    expect(next.summaryOptions).toEqual([]);
    expect(next.finalSelection).toEqual({
      draftVersionId: null,
      titleId: null,
      summaryId: null,
    });
  });

  it("resets downstream workflow data when a different topic is selected", () => {
    const state: WorkflowState = {
      ...createInitialWorkflowState(),
      currentStep: "draft_review",
      structureType: "故事案例型",
      ideaInput: "AI 写作工作流",
      topicOptions: [
        { id: "topic-a", title: "选题 A", angle: "角度 A", summary: "摘要 A" },
        { id: "topic-b", title: "选题 B", angle: "角度 B", summary: "摘要 B" },
      ],
      selectedTopicId: "topic-a",
      brief: {
        objective: "旧目标",
        audience: "旧读者",
        persona: "旧人设",
        tone: "旧语气",
        dropOffPoint: "旧落脚点",
        constraints: ["旧约束"],
      },
      outline: [
        {
          id: "section-1",
          heading: "旧大纲",
          corePoint: "旧观点",
          supportSuggestion: "旧支撑",
          sectionRole: "正文模块",
        },
      ],
      materialSlots: [
        {
          id: "slot-1",
          targetOutlineId: "section-1",
          label: "旧槽位",
          content: "旧内容",
          placement: "正文核心案例",
          purpose: "旧用途",
        },
      ],
      draftVersions: [{ id: "draft-1", label: "旧稿", content: "旧正文" }],
      selectedDraftVersionId: "draft-1",
      titleOptions: [{ id: "title-1", label: "旧标题", content: "旧标题内容" }],
      summaryOptions: [{ id: "summary-1", label: "旧摘要", content: "旧摘要内容" }],
      finalSelection: {
        draftVersionId: "draft-1",
        titleId: "title-1",
        summaryId: "summary-1",
      },
    };

    const next = transitionWorkflow(state, {
      type: "topic_selected",
      topicId: "topic-b",
    });

    expect(next.currentStep).toBe("brief_confirm");
    expect(next.structureType).toBe("痛点拆解型");
    expect(next.selectedTopicId).toBe("topic-b");
    expect(next.brief).toBeNull();
    expect(next.outline).toEqual([]);
    expect(next.materialSlots).toEqual([]);
    expect(next.draftVersions).toEqual([]);
    expect(next.selectedDraftVersionId).toBeNull();
    expect(next.titleOptions).toEqual([]);
    expect(next.summaryOptions).toEqual([]);
    expect(next.finalSelection).toEqual({
      draftVersionId: null,
      titleId: null,
      summaryId: null,
    });
  });

  it("stays on outline review after the outline is generated", () => {
    const state = createInitialWorkflowState();

    const next = transitionWorkflow(state, {
      type: "outline_generated",
      outline: [
        {
          id: "section-1",
          heading: "先讲清问题",
          corePoint: "解释核心判断",
          supportSuggestion: "补充真实案例",
          sectionRole: "痛点引入",
        },
      ],
      materialSlots: [
        {
          id: "slot-1",
          targetOutlineId: "section-1",
          label: "案例",
          content: "补一个真实开发片段。",
          placement: "正文核心案例",
          purpose: "增强真实感",
        },
      ],
    });

    expect(next.currentStep).toBe("outline_review");
    expect(next.outline).toHaveLength(1);
    expect(next.materialSlots).toHaveLength(1);
  });

  it("stays on draft review after draft versions are generated", () => {
    const state = createInitialWorkflowState();

    const next = transitionWorkflow(state, {
      type: "drafts_generated",
      drafts: [
        {
          id: "draft-1",
          label: "版本 A",
          content: "正文内容",
        },
      ],
    });

    expect(next.currentStep).toBe("draft_review");
    expect(next.selectedDraftVersionId).toBe("draft-1");
  });

  it("appends and selects a separately generated humanized draft", () => {
    const state = {
      ...createInitialWorkflowState(),
      draftVersions: [
        { id: "draft-1", label: "原始版", content: "原始正文" },
      ],
      selectedDraftVersionId: "draft-1",
    };
    const next = transitionWorkflow(state, {
      type: "draft_humanized",
      draft: {
        id: "draft-1-humanized",
        label: "去 AI 版",
        content: "自然正文",
      },
    });

    expect(next.draftVersions).toHaveLength(2);
    expect(next.selectedDraftVersionId).toBe("draft-1-humanized");
  });

  it("keeps enriched topic search context after draft versions are generated", () => {
    const state = {
      ...createInitialWorkflowState(),
      topicSearchContext: {
        status: "success" as const,
        query: "AI 副业 痛点",
        intent: "topics" as const,
        freshness: "pastMonth" as const,
        results: [
          {
            title: "普通人用 AI 做副业",
            snippet: "真实复盘。",
            url: "https://mp.weixin.qq.com/s/deep",
            source: "wechat" as const,
          },
        ],
        seoKeywords: ["AI 副业"],
        crowdedness: "medium" as const,
        staleBuzzwords: [],
        notes: [],
      },
    };

    const next = transitionWorkflow(state, {
      type: "drafts_generated",
      drafts: [
        {
          id: "draft-1",
          label: "版本 A",
          content: "正文内容",
        },
      ],
      searchContext: {
        ...state.topicSearchContext,
        results: [
          {
            ...state.topicSearchContext.results[0],
            benchmarkSummary: {
              userPain: "不知道第一步怎么开始。",
              structurePattern: "场景 -> 误区 -> 方法",
              rhythmNotes: "短段和判断句推进。",
              commentInsights: ["第一步最难"],
              reusableAngles: ["从第一步切入"],
              avoidCopying: ["不要照搬案例"],
            },
          },
        ],
      },
    });

    expect(next.topicSearchContext?.results[0]?.benchmarkSummary?.userPain).toBe(
      "不知道第一步怎么开始。"
    );
  });

  it("stays on meta review after titles and summaries are generated", () => {
    const state = createInitialWorkflowState();

    const next = transitionWorkflow(state, {
      type: "meta_generated",
      titles: [
        { id: "title-1", label: "利益结果型", content: "标题 1" },
        { id: "title-2", label: "场景痛点型", content: "标题 2" },
        { id: "title-3", label: "反常识/认知冲突型", content: "标题 3" },
        { id: "title-4", label: "新机会趋势型", content: "标题 4" },
        { id: "title-5", label: "个人故事/实录型", content: "标题 5" },
      ],
      summaries: [
        { id: "summary-1", label: "痛点共鸣版", content: "摘要 1" },
        { id: "summary-2", label: "悬念反转版", content: "摘要 2" },
        { id: "summary-3", label: "专业克制版", content: "摘要 3" },
      ],
    });

    expect(next.currentStep).toBe("meta_review");
    expect(next.titleOptions).toHaveLength(5);
    expect(next.summaryOptions).toHaveLength(3);
  });
});

describe("brief_updated event", () => {
  it("updates brief without changing the current step", () => {
    const state: WorkflowState = {
      ...createInitialWorkflowState(),
      currentStep: "brief_confirm",
      selectedTopicId: "t1",
      topicOptions: [{ id: "t1", title: "Topic", angle: "Angle", summary: "Summary" }],
      brief: {
        objective: "原目标",
        audience: "原读者",
        persona: "原人设",
        tone: "原语气",
        dropOffPoint: "原落脚点",
        constraints: ["原约束"],
      },
    };

    const next = transitionWorkflow(state, {
      type: "brief_updated",
      brief: {
        objective: "新目标",
        audience: "新读者",
        persona: "新人设",
        tone: "新语气",
        dropOffPoint: "新落脚点",
        constraints: ["新约束1", "新约束2"],
      },
    });

    expect(next.currentStep).toBe("brief_confirm");
    expect(next.brief?.objective).toBe("新目标");
    expect(next.brief?.constraints).toEqual(["新约束1", "新约束2"]);
  });
});

describe("go_to_step prerequisite guards", () => {
  it("allows going back to idea_input from any state", () => {
    const state = {
      ...createInitialWorkflowState(),
      currentStep: "draft_review" as const,
      topicOptions: [{ id: "t1", title: "T", angle: "A", summary: "S" }],
      selectedTopicId: "t1",
      brief: {
        objective: "O",
        audience: "A",
        persona: "P",
        tone: "T",
        dropOffPoint: "D",
        constraints: ["C"],
      },
      outline: [{ id: "s1", heading: "H", corePoint: "C", supportSuggestion: "S", sectionRole: "R" }],
      materialSlots: [],
      draftVersions: [{ id: "d1", label: "D", content: "C" }],
      selectedDraftVersionId: "d1",
    };

    const next = transitionWorkflow(state, { type: "go_to_step", step: "idea_input" });
    expect(next.currentStep).toBe("idea_input");
  });

  it("blocks go_to_step to topic_select when no topics exist", () => {
    const state = createInitialWorkflowState();
    const next = transitionWorkflow(state, { type: "go_to_step", step: "topic_select" });
    expect(next.currentStep).toBe("idea_input");
  });

  it("allows go_to_step to topic_select when topics exist", () => {
    const state: WorkflowState = {
      ...createInitialWorkflowState(),
      currentStep: "brief_confirm",
      topicOptions: [{ id: "t1", title: "T", angle: "A", summary: "S" }],
      selectedTopicId: "t1",
      brief: {
        objective: "O",
        audience: "A",
        persona: "P",
        tone: "T",
        dropOffPoint: "D",
        constraints: ["C"],
      },
    };

    const next = transitionWorkflow(state, { type: "go_to_step", step: "topic_select" });
    expect(next.currentStep).toBe("topic_select");
  });

  it("blocks go_to_step to brief_confirm when no topic is selected", () => {
    const state: WorkflowState = {
      ...createInitialWorkflowState(),
      currentStep: "outline_review",
      topicOptions: [{ id: "t1", title: "T", angle: "A", summary: "S" }],
      selectedTopicId: null,
      brief: null,
      outline: [{ id: "s1", heading: "H", corePoint: "C", supportSuggestion: "S", sectionRole: "R" }],
      materialSlots: [],
    };

    const next = transitionWorkflow(state, { type: "go_to_step", step: "brief_confirm" });
    expect(next.currentStep).toBe("outline_review");
  });

  it("blocks go_to_step to draft_review when no outline exists", () => {
    const state: WorkflowState = {
      ...createInitialWorkflowState(),
      currentStep: "meta_review",
      selectedTopicId: "t1",
      topicOptions: [{ id: "t1", title: "T", angle: "A", summary: "S" }],
      brief: { objective: "O", audience: "A", persona: "P", tone: "T", dropOffPoint: "D", constraints: ["C"] },
      outline: [],
      materialSlots: [],
      draftVersions: [{ id: "d1", label: "D", content: "C" }],
      selectedDraftVersionId: "d1",
      titleOptions: [{ id: "t1", label: "L", content: "C" }],
      summaryOptions: [{ id: "s1", label: "L", content: "C" }],
      finalSelection: { draftVersionId: null, titleId: "t1", summaryId: "s1" },
    };

    const next = transitionWorkflow(state, { type: "go_to_step", step: "draft_review" });
    expect(next.currentStep).toBe("meta_review");
  });

  it("blocks go_to_step to finalize when no titles exist", () => {
    const state: WorkflowState = {
      ...createInitialWorkflowState(),
      currentStep: "meta_review",
      titleOptions: [],
      summaryOptions: [],
      finalSelection: { draftVersionId: null, titleId: null, summaryId: null },
    };

    const next = transitionWorkflow(state, { type: "go_to_step", step: "finalize" });
    expect(next.currentStep).toBe("meta_review");
  });
});
