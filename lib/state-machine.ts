import {
  STRUCTURE_TYPE_OPTIONS,
  type WorkflowEvent,
  type WorkflowStep,
  type WorkflowState,
} from "@/types/workflow";

const stepPrerequisites: Record<WorkflowStep, (s: WorkflowState) => boolean> = {
  idea_input: () => true,
  topic_select: (s) => s.topicOptions.length > 0,
  brief_confirm: (s) => s.selectedTopicId !== null,
  outline_review: (s) => s.brief !== null,
  draft_review: (s) => s.outline.length > 0,
  meta_review: (s) => s.draftVersions.length > 0,
  finalize: (s) => s.titleOptions.length > 0,
};

function createWorkflowId() {
  return globalThis.crypto.randomUUID();
}

export function canGoToWorkflowStep(
  state: WorkflowState,
  step: WorkflowStep
): boolean {
  return stepPrerequisites[step](state);
}

export function createInitialWorkflowState(): WorkflowState {
  return {
    workflowId: createWorkflowId(),
    currentStep: "idea_input",
    ideaInput: "",
    structureType: STRUCTURE_TYPE_OPTIONS[0],
    searchSettings: {
      topics: false,
      brief: false,
      outline: false,
      meta: false,
    },
    topicSearchContext: null,
    topicOptions: [],
    selectedTopicId: null,
    brief: null,
    outline: [],
    materialSlots: [],
    draftVersions: [],
    selectedDraftVersionId: null,
    titleOptions: [],
    summaryOptions: [],
    coverSuggestion: null,
    finalSelection: {
      draftVersionId: null,
      titleId: null,
      summaryId: null,
    },
  };
}

export function transitionWorkflow(
  state: WorkflowState,
  event: WorkflowEvent
): WorkflowState {
  switch (event.type) {
    case "idea_updated":
      return {
        ...state,
        ideaInput: event.idea,
      };
    case "topics_generated":
      return {
        ...state,
        currentStep: "topic_select",
        structureType: STRUCTURE_TYPE_OPTIONS[0],
        selectedTopicId: null,
        brief: null,
        outline: [],
        materialSlots: [],
        draftVersions: [],
        selectedDraftVersionId: null,
        titleOptions: [],
        summaryOptions: [],
        coverSuggestion: null,
        finalSelection: {
          draftVersionId: null,
          titleId: null,
          summaryId: null,
        },
        topicSearchContext: event.searchContext ?? null,
        topicOptions: event.topics,
      };
    case "topic_selected":
      return {
        ...state,
        currentStep: "brief_confirm",
        structureType: STRUCTURE_TYPE_OPTIONS[0],
        selectedTopicId: event.topicId,
        brief: null,
        outline: [],
        materialSlots: [],
        draftVersions: [],
        selectedDraftVersionId: null,
        titleOptions: [],
        summaryOptions: [],
        coverSuggestion: null,
        finalSelection: {
          draftVersionId: null,
          titleId: null,
          summaryId: null,
        },
      };
    case "brief_loaded":
      return {
        ...state,
        currentStep: "brief_confirm",
        brief: event.brief,
      };
    case "brief_updated":
      return {
        ...state,
        brief: event.brief,
      };
    case "structure_type_updated":
      return {
        ...state,
        structureType: event.structureType,
      };
    case "brief_confirmed":
      return {
        ...state,
        currentStep: "outline_review",
      };
    case "outline_generated":
      return {
        ...state,
        currentStep: "outline_review",
        outline: event.outline,
        materialSlots: event.materialSlots,
      };
    case "drafts_generated":
      return {
        ...state,
        currentStep: "draft_review",
        draftVersions: event.drafts,
        selectedDraftVersionId: event.drafts[0]?.id ?? null,
        topicSearchContext: event.searchContext ?? state.topicSearchContext,
      };
    case "draft_humanized":
      return {
        ...state,
        draftVersions: [
          ...state.draftVersions.filter((draft) => draft.id !== event.draft.id),
          event.draft,
        ],
        selectedDraftVersionId: event.draft.id,
      };
    case "meta_generated":
      return {
        ...state,
        currentStep: "meta_review",
        titleOptions: event.titles,
        summaryOptions: event.summaries,
        coverSuggestion: event.coverSuggestion,
        finalSelection: {
          ...state.finalSelection,
          titleId: event.titles[0]?.id ?? null,
          summaryId: event.summaries[0]?.id ?? null,
        },
      };
    case "final_version_selected":
      return {
        ...state,
        finalSelection: {
          ...state.finalSelection,
          draftVersionId: event.draftVersionId,
        },
      };
    case "final_title_selected":
      return {
        ...state,
        finalSelection: {
          ...state.finalSelection,
          titleId: event.titleId,
        },
      };
    case "final_summary_selected":
      return {
        ...state,
        finalSelection: {
          ...state.finalSelection,
          summaryId: event.summaryId,
        },
      };
    case "go_to_step":
      if (canGoToWorkflowStep(state, event.step)) {
        return {
          ...state,
          currentStep: event.step,
        };
      }
      return state;
    default:
      return state;
  }
}
