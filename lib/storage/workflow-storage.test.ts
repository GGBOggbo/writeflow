import { describe, expect, it } from "vitest";
import { createInitialWorkflowState } from "../state-machine";
import { loadWorkflowState, saveWorkflowState } from "./workflow-storage";

describe("workflow storage", () => {
  it("saves and restores workflow state", () => {
    const state = createInitialWorkflowState();
    state.ideaInput = "Draft an article";
    state.structureType = "故事案例型";
    state.topicSearchContext = {
      status: "success",
      query: "AI 写作 痛点",
      intent: "topics",
      freshness: "past6Months",
      results: [
        {
          title: "缓存的公众号文章",
          snippet: "后续阶段复用这条链接。",
          url: "https://mp.weixin.qq.com/s/cached",
          source: "wechat",
        },
      ],
      seoKeywords: ["AI 写作"],
      crowdedness: "low",
      staleBuzzwords: [],
      notes: [],
    };

    saveWorkflowState(state);
    const restored = loadWorkflowState();

    expect(restored?.ideaInput).toBe("Draft an article");
    expect(restored?.structureType).toBe("故事案例型");
    expect(restored?.topicSearchContext?.results[0]?.url).toBe(
      "https://mp.weixin.qq.com/s/cached"
    );
    expect(restored?.workflowId).toBe(state.workflowId);
  });

  it("keeps authenticated workflow state isolated by user", () => {
    const userAState = createInitialWorkflowState();
    userAState.ideaInput = "用户 A 的稿件";
    const userBState = createInitialWorkflowState();
    userBState.ideaInput = "用户 B 的稿件";

    saveWorkflowState(userAState, "user-a");
    saveWorkflowState(userBState, "user-b");

    expect(loadWorkflowState("user-a")?.ideaInput).toBe("用户 A 的稿件");
    expect(loadWorkflowState("user-b")?.ideaInput).toBe("用户 B 的稿件");
  });

  it("does not restore legacy anonymous workflow state for authenticated users", () => {
    const legacy = createInitialWorkflowState();
    legacy.ideaInput = "旧账号留在浏览器里的稿件";
    saveWorkflowState(legacy);

    expect(loadWorkflowState("new-user")).toBeNull();
  });

  it("adds a workflow id when restoring legacy state", () => {
    const legacy = createInitialWorkflowState() as Partial<ReturnType<typeof createInitialWorkflowState>>;
    delete legacy.workflowId;
    window.localStorage.setItem("ai-writing-mvp-workflow", JSON.stringify(legacy));

    const restored = loadWorkflowState();

    expect(restored?.workflowId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("rewinds to the last valid step when restored state is inconsistent", () => {
    window.localStorage.setItem(
      "ai-writing-mvp-workflow",
      JSON.stringify({
        ...createInitialWorkflowState(),
        currentStep: "draft_review",
        ideaInput: "写一篇关于状态恢复的文章",
        topicOptions: [
          {
            id: "topic-1",
            title: "状态恢复",
            angle: "从产品容错切入",
            summary: "解释为什么刷新后不能进入空页面。",
          },
        ],
        selectedTopicId: "topic-1",
        brief: {
          objective: "解释恢复逻辑",
          audience: "产品开发者",
          persona: "一个踩过坑的产品前辈",
          tone: "清晰",
          dropOffPoint: "让读者知道为什么恢复逻辑必须前置考虑",
          constraints: ["不要空白页"],
        },
        outline: [
          {
            id: "section-1",
            heading: "为什么会出现空状态",
            notes: "先解释根因。",
          },
        ],
        materialSlots: [
          {
            id: "slot-1",
            targetOutlineId: "section-1",
            label: "案例",
            content: "刷新页面后进入半残状态。",
          },
        ],
        draftVersions: [],
        selectedDraftVersionId: null,
      })
    );

    const restored = loadWorkflowState();

    expect(restored?.currentStep).toBe("outline_review");
    expect(restored?.outline).toHaveLength(1);
    expect(restored?.ideaInput).toBe("写一篇关于状态恢复的文章");
  });

  it("invalidates saved brief data when persona or dropOffPoint is blank", () => {
    window.localStorage.setItem(
      "ai-writing-mvp-workflow",
      JSON.stringify({
        ...createInitialWorkflowState(),
        currentStep: "brief_confirm",
        ideaInput: "迪迦奥特曼",
        topicOptions: [
          {
            id: "topic-1",
            title: "看了100遍《迪迦》才发现：那些怪兽，都是我们自己",
            angle: "从心理学和成人视角重新解读情绪困境",
            summary: "怀旧切入，落到成人情绪管理。",
          },
        ],
        selectedTopicId: "topic-1",
        brief: {
          objective: "引发读者共鸣",
          audience: "怀旧的成年人",
          persona: "   ",
          tone: "有共鸣",
          dropOffPoint: "",
          constraints: ["不要空话"],
        },
      })
    );

    const restored = loadWorkflowState();

    expect(restored?.brief).toBeNull();
    expect(restored?.currentStep).toBe("topic_select");
  });

  it("invalidates saved brief data when it still contains legacy placeholder values", () => {
    window.localStorage.setItem(
      "ai-writing-mvp-workflow",
      JSON.stringify({
        ...createInitialWorkflowState(),
        currentStep: "brief_confirm",
        ideaInput: "迪迦奥特曼",
        topicOptions: [
          {
            id: "topic-1",
            title: "看了100遍《迪迦》才发现：那些怪兽，都是我们自己",
            angle: "从心理学和成人视角重新解读情绪困境",
            summary: "怀旧切入，落到成人情绪管理。",
          },
        ],
        selectedTopicId: "topic-1",
        brief: {
          objective: "引发读者共鸣",
          audience: "怀旧的成年人",
          persona: "像一个踩过坑、愿意说真话的实战派前辈，陪读者把问题讲透。",
          tone: "有共鸣",
          dropOffPoint:
            "让读者记住这篇文章最核心的判断，并愿意立刻开始下一步行动或表达共鸣。",
          constraints: ["不要空话"],
        },
      })
    );

    const restored = loadWorkflowState();

    expect(restored?.brief).toBeNull();
    expect(restored?.currentStep).toBe("topic_select");
  });

  it("rewinds meta review to draft review when meta cards are missing", () => {
    window.localStorage.setItem(
      "ai-writing-mvp-workflow",
      JSON.stringify({
        ...createInitialWorkflowState(),
        currentStep: "meta_review",
        draftVersions: [
          {
            id: "draft-1",
            label: "版本 A",
            content: "正文内容",
          },
        ],
        selectedDraftVersionId: "draft-1",
        titleOptions: [],
        summaryOptions: [],
        finalSelection: {
          draftVersionId: null,
          titleId: null,
          summaryId: null,
        },
      })
    );

    const restored = loadWorkflowState();

    expect(restored?.currentStep).toBe("draft_review");
    expect(restored?.draftVersions).toHaveLength(1);
  });

  it("falls back to the first title and summary when saved final selection is invalid", () => {
    window.localStorage.setItem(
      "ai-writing-mvp-workflow",
      JSON.stringify({
        ...createInitialWorkflowState(),
        currentStep: "finalize",
        draftVersions: [
          {
            id: "draft-1",
            label: "版本 A",
            content: "正文内容",
          },
        ],
        selectedDraftVersionId: "draft-1",
        titleOptions: [
          {
            id: "title-1",
            label: "标题方案 A",
            content: "标题 A",
          },
        ],
        summaryOptions: [
          {
            id: "summary-1",
            label: "摘要方案 A",
            content: "摘要 A",
          },
        ],
        finalSelection: {
          draftVersionId: "draft-1",
          titleId: "missing-title",
          summaryId: "missing-summary",
        },
      })
    );

    const restored = loadWorkflowState();

    expect(restored?.finalSelection.titleId).toBe("title-1");
    expect(restored?.finalSelection.summaryId).toBe("summary-1");
  });

  it("drops legacy AI formatting state on restore", () => {
    const state = createInitialWorkflowState();
    state.draftVersions = [
      { id: "draft-1", label: "原始版", content: "正文内容" },
    ];
    state.selectedDraftVersionId = "draft-1";
    window.localStorage.setItem(
      "ai-writing-mvp-workflow",
      JSON.stringify({
        ...state,
        draftFormattingByVersion: {
          "draft-1": {
            draftVersionId: "draft-1",
            blocks: [{ id: "b1", type: "quote", text: "正文内容" }],
            selectedTheme: "warm-orange",
            generatedAt: "2026-06-13T00:00:00.000Z",
          },
        },
      })
    );

    expect(loadWorkflowState()).not.toHaveProperty("draftFormattingByVersion");
  });
});
