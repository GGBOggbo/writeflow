"use client";

import { useEffect, useRef, useState } from "react";
import {
  completeDraftMaterials as requestDraftMaterialCompletion,
  formatDraft as requestDraftFormatting,
  generateBrief,
  generateDraft,
  generateOutline,
  generateTitlesAndSummaries,
  generateTopics,
} from "@/lib/ai/client";
import { getErrorMessage } from "@/lib/ai/errors";
import {
  createInitialWorkflowState,
  transitionWorkflow,
} from "@/lib/state-machine";
import {
  clearWorkflowState,
  loadWorkflowState,
  saveWorkflowState,
} from "@/lib/storage/workflow-storage";
import { copyText } from "@/lib/copy/copy-text";
import type {
  Brief,
  SearchSettings,
  StructureType,
  TopicOption,
  WorkflowState,
} from "@/types/workflow";
import type { WorkflowProgressEvent } from "@/lib/progress/types";
import type { CreditBalance } from "@/types/credits";

type WorkflowAction =
  | "generate_topics"
  | "select_topic"
  | "confirm_brief"
  | "generate_drafts"
  | "format_draft"
  | "complete_draft_materials"
  | "generate_meta";

type RequestStatus = {
  action: WorkflowAction;
  message: string;
  events: WorkflowProgressEvent[];
};

type FailedRequest = {
  action: WorkflowAction;
  operationId: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getSelectedTopic(state: WorkflowState): TopicOption | undefined {
  if (!state.selectedTopicId) return undefined;
  return state.topicOptions.find((topic) => topic.id === state.selectedTopicId);
}

function canReuseTopicSearchContext(state: WorkflowState) {
  return state.topicSearchContext?.status === "success";
}

function createOperationId() {
  return globalThis.crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWorkflow(
  initialCreditBalance: CreditBalance | null = null,
  storageOwnerKey: string | null = null
) {
  const [state, setState] = useState<WorkflowState>(createInitialWorkflowState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState("复制最终稿");
  const [copyFailed, setCopyFailed] = useState(false);
  const [creditBalance, setCreditBalance] = useState<CreditBalance | null>(
    initialCreditBalance
  );
  const [requestStatus, setRequestStatus] = useState<RequestStatus | null>(null);
  const [lastFailedRequest, setLastFailedRequest] =
    useState<FailedRequest | null>(null);
  const [resetPending, setResetPending] = useState(false);
  const activeUiRequestSequenceRef = useRef(0);
  const canGenerate =
    creditBalance === null ||
    creditBalance.unlimited ||
    creditBalance.remaining > 0;

  // -- localStorage persistence --

  useEffect(() => {
    const restored = loadWorkflowState(storageOwnerKey);

    if (restored) {
      queueMicrotask(() => {
        setState(restored);
      });
    }
  }, [storageOwnerKey]);

  useEffect(() => {
    saveWorkflowState(state, storageOwnerKey);
  }, [state, storageOwnerKey]);

  // -- Internal helpers --

  const updateState = (nextState: WorkflowState) => {
    setState(nextState);
    setError(null);
    setLastFailedRequest(null);
    setResetPending(false);
  };

  const startRequest = (action: WorkflowAction, message: string) => {
    const uiRequestSequence = activeUiRequestSequenceRef.current + 1;
    activeUiRequestSequenceRef.current = uiRequestSequence;
    setLoading(true);
    setRequestStatus({ action, message, events: [] });
    setLastFailedRequest(null);
    setResetPending(false);
    return uiRequestSequence;
  };

  const isActiveRequest = (uiRequestSequence: number) =>
    activeUiRequestSequenceRef.current === uiRequestSequence;

  const finishRequest = (uiRequestSequence: number) => {
    if (isActiveRequest(uiRequestSequence)) {
      setLoading(false);
      setRequestStatus(null);
    }
  };

  const confirmWorkflowId = (confirmedWorkflowId: string) => {
    setState((current) =>
      current.workflowId === confirmedWorkflowId
        ? current
        : { ...current, workflowId: confirmedWorkflowId }
    );
  };

  const getSearchStatusNotice = (
    status?: "success" | "degraded" | "empty"
  ) => {
    if (status === "degraded") {
      return "联网增强暂不可用，本次生成已自动降级为基础模式。";
    }

    return null;
  };

  const recordProgress = (uiRequestSequence: number) => (event: WorkflowProgressEvent) => {
    if (!isActiveRequest(uiRequestSequence)) {
      return;
    }

    setRequestStatus((current) =>
      current
        ? {
            ...current,
            events: [...current.events, event],
          }
        : current
    );
  };

  const cancelPendingRequests = () => {
    activeUiRequestSequenceRef.current += 1;
    setLoading(false);
    setRequestStatus(null);
  };

  const failRequest = (
    uiRequestSequence: number,
    action: WorkflowAction,
    operationId: string,
    err: unknown,
    fallbackMessage: string
  ) => {
    if (isActiveRequest(uiRequestSequence)) {
      setError(getErrorMessage(err, fallbackMessage));
      setLastFailedRequest({ action, operationId });
    }
  };

  // -- Handlers --

  const handleIdeaChange = (value: string) => {
    updateState(
      transitionWorkflow(state, {
        type: "idea_updated",
        idea: value,
      })
    );
  };

  const handleGenerateTopics = async (retryOperationId?: string) => {
    const action = "generate_topics";
    const operationId = retryOperationId ?? createOperationId();
    const uiRequestSequence = startRequest(
      action,
      state.searchSettings.topics
        ? "正在联网检索并生成选题方向..."
        : "正在生成选题方向..."
    );

    try {
      setError(null);
      const result = await generateTopics(
        state.workflowId,
        {
          operationId,
          idea: state.ideaInput,
          searchEnabled: state.searchSettings.topics,
          searchMode: "default",
        },
        recordProgress(uiRequestSequence),
        setCreditBalance,
        confirmWorkflowId
      );
      if (!isActiveRequest(uiRequestSequence)) {
        return;
      }
      updateState(
        transitionWorkflow(state, {
          type: "topics_generated",
          topics: result.topics,
          searchContext: result.searchContext,
        })
      );
      const notice = getSearchStatusNotice(result.searchStatus);
      if (notice) {
        setError(notice);
      }
    } catch (err) {
      failRequest(uiRequestSequence, action, operationId, err, "生成选题失败。");
    } finally {
      finishRequest(uiRequestSequence);
    }
  };

  const handleSelectTopic = async (
    topicId: string,
    retryOperationId?: string
  ) => {
    const selectedTopic = state.topicOptions.find((topic) => topic.id === topicId);

    if (!selectedTopic) {
      setError("未找到已选择的选题，请重新生成选题。");
      return;
    }

    const action = "select_topic";
    const operationId = retryOperationId ?? createOperationId();
    const canUseSearchContext = canReuseTopicSearchContext(state);
    const uiRequestSequence = startRequest(
      action,
      canUseSearchContext
        ? "正在复用选题搜索参考并生成写作策略单..."
        : "正在生成写作策略单..."
    );

    try {
      setError(null);
      const selectedState = transitionWorkflow(state, {
        type: "topic_selected",
        topicId,
      });
      setState(selectedState);
      setError(null);
      const result = await generateBrief(
        state.workflowId,
        {
          operationId,
          topicId,
          topicLabel: selectedTopic.label,
          topicAngle: selectedTopic.angle,
          coreViewpoint: selectedTopic.coreViewpoint,
          targetAudience: selectedTopic.targetAudience,
          reason: selectedTopic.reason,
          structureType: selectedState.structureType,
          searchEnabled: canUseSearchContext,
          searchMode: "default",
          searchContext: state.topicSearchContext,
        },
        recordProgress(uiRequestSequence),
        setCreditBalance,
        confirmWorkflowId
      );
      if (!isActiveRequest(uiRequestSequence)) {
        return;
      }
      updateState(
        transitionWorkflow(selectedState, {
          type: "brief_loaded",
          brief: result.brief,
        })
      );
      const notice = getSearchStatusNotice(result.searchStatus);
      if (notice) {
        setError(notice);
      }
    } catch (err) {
      failRequest(uiRequestSequence, action, operationId, err, "生成 Brief 失败。");
    } finally {
      finishRequest(uiRequestSequence);
    }
  };

  const handleBriefUpdate = (brief: Brief) => {
    updateState(
      transitionWorkflow(state, {
        type: "brief_updated",
        brief,
      })
    );
  };

  const handleStructureTypeChange = (structureType: StructureType) => {
    updateState(
      transitionWorkflow(state, {
        type: "structure_type_updated",
        structureType,
      })
    );
  };

  const handleConfirmBrief = async (retryOperationId?: string) => {
    if (!state.selectedTopicId || !state.brief) {
      return;
    }

    const selectedTopic = getSelectedTopic(state);

    if (!selectedTopic) {
      setError("未找到当前选题，请重新生成选题。");
      return;
    }

    const action = "confirm_brief";
    const operationId = retryOperationId ?? createOperationId();
    const canUseSearchContext = canReuseTopicSearchContext(state);
    const uiRequestSequence = startRequest(
      action,
      canUseSearchContext
        ? "正在复用选题搜索参考并生成结构大纲..."
        : "正在生成结构大纲..."
    );

    try {
      setError(null);
      const result = await generateOutline(
        state.workflowId,
        {
          operationId,
          topicId: state.selectedTopicId,
          topicLabel: selectedTopic.label,
          topicAngle: selectedTopic.angle,
          coreViewpoint: selectedTopic.coreViewpoint,
          targetAudience: selectedTopic.targetAudience,
          reason: selectedTopic.reason,
          structureType: state.structureType,
          briefObjective: state.brief.objective,
          briefAudience: state.brief.audience,
          briefPersona: state.brief.persona,
          briefTone: state.brief.tone,
          briefDropOffPoint: state.brief.dropOffPoint,
          briefConstraints: state.brief.constraints,
          searchEnabled: canUseSearchContext,
          searchMode: "default",
          searchContext: state.topicSearchContext,
        },
        recordProgress(uiRequestSequence),
        setCreditBalance,
        confirmWorkflowId
      );
      if (!isActiveRequest(uiRequestSequence)) {
        return;
      }
      updateState(
        transitionWorkflow(state, {
          type: "outline_generated",
          outline: result.outline,
          materialSlots: result.materialSlots,
        })
      );
      const notice = getSearchStatusNotice(result.searchStatus);
      if (notice) {
        setError(notice);
      }
    } catch (err) {
      failRequest(uiRequestSequence, action, operationId, err, "生成大纲失败。");
    } finally {
      finishRequest(uiRequestSequence);
    }
  };

  const handleGenerateDrafts = async (retryOperationId?: string) => {
    if (!state.selectedTopicId || !state.brief || state.outline.length === 0) {
      return;
    }

    const selectedTopic = getSelectedTopic(state);

    if (!selectedTopic) {
      setError("未找到当前选题，请重新生成选题。");
      return;
    }

    const action = "generate_drafts";
    const operationId = retryOperationId ?? createOperationId();
    const canUseSearchContext = canReuseTopicSearchContext(state);
    const uiRequestSequence = startRequest(
      action,
      canUseSearchContext
        ? "正在总结对标文章并生成正文版本..."
        : "正在生成正文版本..."
    );

    try {
      setError(null);
      const result = await generateDraft(
        state.workflowId,
        {
          operationId,
          topicId: state.selectedTopicId,
          topicLabel: selectedTopic.label,
          topicAngle: selectedTopic.angle,
          coreViewpoint: selectedTopic.coreViewpoint,
          targetAudience: selectedTopic.targetAudience,
          reason: selectedTopic.reason,
          structureType: state.structureType,
          briefObjective: state.brief.objective,
          briefAudience: state.brief.audience,
          briefPersona: state.brief.persona,
          briefTone: state.brief.tone,
          briefDropOffPoint: state.brief.dropOffPoint,
          briefConstraints: state.brief.constraints,
          outline: state.outline,
          materialSlots: state.materialSlots,
          searchEnabled: canUseSearchContext,
          searchMode: "default",
          searchContext: state.topicSearchContext,
        },
        recordProgress(uiRequestSequence),
        setCreditBalance,
        confirmWorkflowId
      );
      if (!isActiveRequest(uiRequestSequence)) {
        return;
      }
      updateState(
        transitionWorkflow(state, {
          type: "drafts_generated",
          drafts: result.drafts,
          searchContext: result.searchContext,
        })
      );
    } catch (err) {
      failRequest(
        uiRequestSequence,
        action,
        operationId,
        err,
        "生成正文版本失败。"
      );
    } finally {
      finishRequest(uiRequestSequence);
    }
  };

  const handleSelectDraft = (draftId: string) => {
    updateState({
      ...state,
      selectedDraftVersionId: draftId,
    });
  };

  const handleUpdateDraft = (draftVersionId: string, content: string) => {
    setError(null);
    updateState(
      transitionWorkflow(state, {
        type: "draft_updated",
        draftVersionId,
        content,
      })
    );
    return true;
  };

  const handleFormatDraft = async (retryOperationId?: string) => {
    const selectedDraft = state.draftVersions.find(
      (draft) => draft.id === state.selectedDraftVersionId
    );

    if (!selectedDraft) {
      setError("未找到当前正文，请重新选择正文版本。");
      return;
    }

    const action = "format_draft";
    const operationId = retryOperationId ?? createOperationId();
    const uiRequestSequence = startRequest(
      action,
      "正在用 AI 整理 Markdown 和模块排版..."
    );

    try {
      setError(null);
      const result = await requestDraftFormatting(
        state.workflowId,
        { operationId, draft: selectedDraft },
        recordProgress(uiRequestSequence),
        confirmWorkflowId
      );
      if (!isActiveRequest(uiRequestSequence)) {
        return;
      }
      updateState(
        transitionWorkflow(state, {
          type: "draft_formatted",
          draft: result.draft,
        })
      );
    } catch (err) {
      failRequest(
        uiRequestSequence,
        action,
        operationId,
        err,
        "AI 排版失败，当前正文未受影响。"
      );
    } finally {
      finishRequest(uiRequestSequence);
    }
  };

  const handleCompleteDraftMaterials = async (retryOperationId?: string) => {
    if (!state.brief) {
      setError("未找到当前 Brief，无法补充正文素材。");
      return;
    }

    const selectedTopic = getSelectedTopic(state);
    const selectedDraft = state.draftVersions.find(
      (draft) => draft.id === state.selectedDraftVersionId
    );

    if (!selectedTopic || !selectedDraft) {
      setError("未找到当前选题或正文，请重新选择正文版本。");
      return;
    }

    const action = "complete_draft_materials";
    const operationId = retryOperationId ?? createOperationId();
    const uiRequestSequence = startRequest(
      action,
      "正在根据现有资料补充正文素材..."
    );

    try {
      setError(null);
      const result = await requestDraftMaterialCompletion(
        state.workflowId,
        {
          operationId,
          draft: selectedDraft,
          topicLabel: selectedTopic.label,
          topicAngle: selectedTopic.angle,
          coreViewpoint: selectedTopic.coreViewpoint,
          briefObjective: state.brief.objective,
          briefAudience: state.brief.audience,
          briefPersona: state.brief.persona,
          outline: state.outline,
          searchContext: state.topicSearchContext,
        },
        recordProgress(uiRequestSequence),
        confirmWorkflowId
      );
      if (!isActiveRequest(uiRequestSequence)) {
        return;
      }
      updateState(
        transitionWorkflow(state, {
          type: "draft_materials_completed",
          draft: result.draft,
        })
      );
    } catch (err) {
      failRequest(
        uiRequestSequence,
        action,
        operationId,
        err,
        "AI 补充素材失败，当前正文未受影响。"
      );
    } finally {
      finishRequest(uiRequestSequence);
    }
  };

  const handleGenerateMeta = async (retryOperationId?: string) => {
    if (!state.selectedTopicId || !state.selectedDraftVersionId || !state.brief) {
      return;
    }

    const selectedTopic = getSelectedTopic(state);
    const selectedDraft = state.draftVersions.find(
      (draft) => draft.id === state.selectedDraftVersionId
    );

    if (!selectedTopic || !selectedDraft) {
      setError("未找到当前稿件，请重新生成正文版本。");
      return;
    }

    const action = "generate_meta";
    const operationId = retryOperationId ?? createOperationId();
    const canUseSearchContext = canReuseTopicSearchContext(state);
    const uiRequestSequence = startRequest(
      action,
      canUseSearchContext
        ? "正在复用选题搜索参考并生成标题摘要..."
        : "正在生成标题摘要..."
    );

    try {
      setError(null);
      const result = await generateTitlesAndSummaries(
        state.workflowId,
        {
          operationId,
          topicLabel: selectedTopic.label,
          coreViewpoint: selectedTopic.coreViewpoint,
          topicAngle: selectedTopic.angle,
          structureType: state.structureType,
          briefObjective: state.brief.objective,
          briefAudience: state.brief.audience,
          briefPersona: state.brief.persona,
          briefDropOffPoint: state.brief.dropOffPoint,
          draftContent: selectedDraft.content,
          searchEnabled: canUseSearchContext,
          searchMode: "default",
          searchContext: state.topicSearchContext,
        },
        recordProgress(uiRequestSequence),
        setCreditBalance,
        confirmWorkflowId
      );
      if (!isActiveRequest(uiRequestSequence)) {
        return;
      }
      updateState(
        transitionWorkflow(state, {
          type: "meta_generated",
          titles: result.titles,
          summaries: result.summaries,
          coverSuggestion: result.coverSuggestion,
          coverImagePrompt: result.coverImagePrompt,
        })
      );
      const notice = getSearchStatusNotice(result.searchStatus);
      if (notice) {
        setError(notice);
      }
    } catch (err) {
      failRequest(
        uiRequestSequence,
        action,
        operationId,
        err,
        "生成标题和摘要失败。"
      );
    } finally {
      finishRequest(uiRequestSequence);
    }
  };

  const handleContinueToFinal = () => {
    updateState(
      transitionWorkflow(state, {
        type: "go_to_step",
        step: "finalize",
      })
    );
  };

  const handleBackToMeta = () => {
    updateState(
      transitionWorkflow(state, {
        type: "go_to_step",
        step: "meta_review",
      })
    );
  };

  const handleGoToStep = (step: WorkflowState["currentStep"]) => {
    updateState(
      transitionWorkflow(state, {
        type: "go_to_step",
        step,
      })
    );
  };

  const handleSetSearchEnabled = (
    stage: keyof SearchSettings,
    enabled: boolean
  ) => {
    updateState({
      ...state,
      searchSettings: {
        ...state.searchSettings,
        [stage]: enabled,
      },
    });
  };

  const handleSelectFinal = (draftId: string) => {
    updateState(
      transitionWorkflow(state, {
        type: "final_version_selected",
        draftVersionId: draftId,
      })
    );
  };

  const handleSelectTitle = (titleId: string) => {
    updateState(
      transitionWorkflow(state, {
        type: "final_title_selected",
        titleId,
      })
    );
  };

  const handleSelectSummary = (summaryId: string) => {
    updateState(
      transitionWorkflow(state, {
        type: "final_summary_selected",
        summaryId,
      })
    );
  };

  const buildFinalContent = () => {
    const selectedId =
      state.finalSelection.draftVersionId ?? state.selectedDraftVersionId;
    const selectedDraft = state.draftVersions.find(
      (draft) => draft.id === selectedId
    );
    const selectedTitle = state.titleOptions.find(
      (title) => title.id === state.finalSelection.titleId
    );
    const selectedSummary = state.summaryOptions.find(
      (summary) => summary.id === state.finalSelection.summaryId
    );

    return [
      selectedTitle?.content,
      selectedSummary?.content ? `摘要：${selectedSummary.content}` : null,
      selectedDraft?.content,
    ]
      .filter(Boolean)
      .join("\n\n");
  };

  const handleCopyFinal = async () => {
    const finalContent = buildFinalContent();

    if (!finalContent) {
      return;
    }

    try {
      await copyText(finalContent);
      setCopyLabel("已复制最终稿");
      setCopyFailed(false);
    } catch (err) {
      setCopyFailed(true);
      setError(
        getErrorMessage(err, "自动复制失败，请用下方文本框手动复制。")
      );
    }
  };

  const handleRetryLastAction = () => {
    if (!lastFailedRequest || loading) {
      return;
    }

    const { action, operationId } = lastFailedRequest;
    setLastFailedRequest(null);

    if (action === "generate_topics") {
      void handleGenerateTopics(operationId);
      return;
    }

    if (action === "select_topic" && state.selectedTopicId) {
      void handleSelectTopic(state.selectedTopicId, operationId);
      return;
    }

    if (action === "confirm_brief") {
      void handleConfirmBrief(operationId);
      return;
    }

    if (action === "generate_drafts") {
      void handleGenerateDrafts(operationId);
      return;
    }


    if (action === "format_draft") {
      void handleFormatDraft(operationId);
      return;
    }

    if (action === "complete_draft_materials") {
      void handleCompleteDraftMaterials(operationId);
      return;
    }

    if (action === "generate_meta") {
      void handleGenerateMeta(operationId);
    }
  };

  const handleRequestResetWorkflow = () => {
    setResetPending(true);
  };

  const handleCancelResetWorkflow = () => {
    setResetPending(false);
  };

  const handleConfirmResetWorkflow = () => {
    cancelPendingRequests();
    clearWorkflowState(storageOwnerKey);
    setState(createInitialWorkflowState());
    setError(null);
    setLastFailedRequest(null);
    setRequestStatus(null);
    setResetPending(false);
    setCopyLabel("复制最终稿");
    setCopyFailed(false);
  };

  return {
    state,
    creditBalance,
    canGenerate,
    loading,
    error,
    requestStatus,
    canRetryLastAction: lastFailedRequest !== null,
    resetPending,
    copyLabel,
    copyFailed,
    handleIdeaChange,
    handleGenerateTopics,
    handleSelectTopic,
    handleBriefUpdate,
    handleStructureTypeChange,
    handleConfirmBrief,
    handleGenerateDrafts,
    handleFormatDraft,
    handleCompleteDraftMaterials,
    handleSelectDraft,
    handleUpdateDraft,
    handleGenerateMeta,
    handleContinueToFinal,
    handleBackToMeta,
    handleGoToStep,
    handleSetSearchEnabled,
    handleSelectFinal,
    handleSelectTitle,
    handleSelectSummary,
    handleCopyFinal,
    handleRetryLastAction,
    handleRequestResetWorkflow,
    handleCancelResetWorkflow,
    handleConfirmResetWorkflow,
  };
}
