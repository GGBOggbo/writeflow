import { createInitialWorkflowState } from "../state-machine";
import type { WorkflowState } from "@/types/workflow";
import {
  briefSchema,
  materialSlotSchema,
  outlineSectionSchema,
  searchReferenceBundleSchema,
  topicOptionSchema,
} from "@/lib/ai/schemas";

const STORAGE_KEY = "ai-writing-mvp-workflow";
const LEGACY_PLACEHOLDER_PERSONA =
  "像一个踩过坑、愿意说真话的实战派前辈，陪读者把问题讲透。";
const LEGACY_PLACEHOLDER_DROP_OFF_POINT =
  "让读者记住这篇文章最核心的判断，并愿意立刻开始下一步行动或表达共鸣。";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function saveWorkflowState(state: WorkflowState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadWorkflowState(): WorkflowState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return normalizeWorkflowState(JSON.parse(raw) as Partial<WorkflowState>);
  } catch {
    return null;
  }
}

export function clearWorkflowState() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

function normalizeWorkflowState(
  rawState: Partial<WorkflowState>
): WorkflowState {
  const baseState = createInitialWorkflowState();
  const parsedBrief = rawState.brief
    ? briefSchema.safeParse(rawState.brief)
    : null;
  const hasLegacyPlaceholderBrief =
    parsedBrief?.success &&
    (parsedBrief.data.persona === LEGACY_PLACEHOLDER_PERSONA ||
      parsedBrief.data.dropOffPoint === LEGACY_PLACEHOLDER_DROP_OFF_POINT);
  const outline = (rawState.outline ?? baseState.outline).map((section) =>
    outlineSectionSchema.parse(section)
  );
  const fallbackOutlineId = outline[0]?.id ?? "section-1";
  const nextState: WorkflowState = {
    ...baseState,
    ...rawState,
    workflowId:
      typeof rawState.workflowId === "string" && UUID_PATTERN.test(rawState.workflowId)
        ? rawState.workflowId
        : baseState.workflowId,
    searchSettings: {
      ...baseState.searchSettings,
      ...rawState.searchSettings,
    },
    topicSearchContext: rawState.topicSearchContext
      ? searchReferenceBundleSchema.safeParse(rawState.topicSearchContext).success
        ? searchReferenceBundleSchema.parse(rawState.topicSearchContext)
        : null
      : null,
    topicOptions: (rawState.topicOptions ?? baseState.topicOptions).map((topic) =>
      topicOptionSchema.parse(topic)
    ),
    brief:
      parsedBrief?.success && !hasLegacyPlaceholderBrief
        ? parsedBrief.data
        : null,
    outline,
    materialSlots: (rawState.materialSlots ?? baseState.materialSlots).map((slot) =>
      materialSlotSchema.parse({
        ...slot,
        targetOutlineId:
          typeof slot?.targetOutlineId === "string" && slot.targetOutlineId.trim()
            ? slot.targetOutlineId
            : fallbackOutlineId,
      })
    ),
    draftVersions: rawState.draftVersions ?? baseState.draftVersions,
    titleOptions: rawState.titleOptions ?? baseState.titleOptions,
    summaryOptions: rawState.summaryOptions ?? baseState.summaryOptions,
    coverSuggestion:
      typeof rawState.coverSuggestion === "string"
        ? rawState.coverSuggestion
        : baseState.coverSuggestion,
    finalSelection: {
      draftVersionId:
        rawState.finalSelection?.draftVersionId ??
        baseState.finalSelection.draftVersionId,
      titleId:
        rawState.finalSelection?.titleId ?? baseState.finalSelection.titleId,
      summaryId:
        rawState.finalSelection?.summaryId ??
        baseState.finalSelection.summaryId,
    },
  };

  const hasTopics = nextState.topicOptions.length > 0;
  const hasBrief =
    nextState.selectedTopicId !== null && nextState.brief !== null;
  const hasOutline =
    nextState.outline.length > 0 && nextState.materialSlots.length > 0;
  const hasDrafts = nextState.draftVersions.length > 0;
  const hasMeta =
    nextState.titleOptions.length > 0 && nextState.summaryOptions.length > 0;

  if (nextState.currentStep === "finalize" && (!hasDrafts || !hasMeta)) {
    nextState.currentStep = hasDrafts && hasMeta
      ? "meta_review"
      : hasDrafts
        ? "draft_review"
        : hasOutline
      ? "outline_review"
      : hasBrief
        ? "brief_confirm"
        : hasTopics
          ? "topic_select"
          : "idea_input";
  }

  if (nextState.currentStep === "meta_review" && (!hasDrafts || !hasMeta)) {
    nextState.currentStep = hasDrafts
      ? "draft_review"
      : hasOutline
      ? "outline_review"
      : hasBrief
        ? "brief_confirm"
        : hasTopics
          ? "topic_select"
          : "idea_input";
  }

  if (nextState.currentStep === "draft_review" && !hasDrafts) {
    nextState.currentStep = hasOutline
      ? "outline_review"
      : hasBrief
        ? "brief_confirm"
        : hasTopics
          ? "topic_select"
          : "idea_input";
  }

  if (nextState.currentStep === "outline_review" && !hasOutline) {
    nextState.currentStep = hasBrief
      ? "brief_confirm"
      : hasTopics
        ? "topic_select"
        : "idea_input";
  }

  if (nextState.currentStep === "brief_confirm" && !hasBrief) {
    nextState.currentStep = hasTopics ? "topic_select" : "idea_input";
  }

  if (nextState.currentStep === "topic_select" && !hasTopics) {
    nextState.currentStep = "idea_input";
  }

  if (
    nextState.selectedDraftVersionId &&
    !nextState.draftVersions.some(
      (draft) => draft.id === nextState.selectedDraftVersionId
    )
  ) {
    nextState.selectedDraftVersionId = nextState.draftVersions[0]?.id ?? null;
  }

  if (
    nextState.finalSelection.draftVersionId &&
    !nextState.draftVersions.some(
      (draft) => draft.id === nextState.finalSelection.draftVersionId
    )
  ) {
    nextState.finalSelection.draftVersionId = null;
  }

  if (
    nextState.finalSelection.titleId &&
    !nextState.titleOptions.some(
      (title) => title.id === nextState.finalSelection.titleId
    )
  ) {
    nextState.finalSelection.titleId = nextState.titleOptions[0]?.id ?? null;
  }

  if (
    nextState.finalSelection.summaryId &&
    !nextState.summaryOptions.some(
      (summary) => summary.id === nextState.finalSelection.summaryId
    )
  ) {
    nextState.finalSelection.summaryId =
      nextState.summaryOptions[0]?.id ?? null;
  }

  return nextState;
}
