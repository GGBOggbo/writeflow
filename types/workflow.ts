export type WorkflowStep =
  | "idea_input"
  | "topic_select"
  | "brief_confirm"
  | "outline_review"
  | "draft_review"
  | "meta_review"
  | "finalize";

export const STRUCTURE_TYPE_OPTIONS = [
  "痛点拆解型",
  "清单干货型",
  "故事案例型",
] as const;

export type StructureType = (typeof STRUCTURE_TYPE_OPTIONS)[number];

export type SearchSettings = {
  topics: boolean;
  brief: boolean;
  outline: boolean;
  meta: boolean;
};

export type TopicOption = {
  id: string;
  title: string;
  label: string;
  angle: string;
  summary: string;
  coreViewpoint: string;
  targetAudience: string;
  reason: string;
};

export type Brief = {
  objective: string;
  audience: string;
  persona: string;
  tone: string;
  dropOffPoint: string;
  constraints: string[];
};

export type OutlineSection = {
  id: string;
  heading: string;
  corePoint: string;
  supportSuggestion: string;
  sectionRole: string;
  notes?: string;
};

export type MaterialSlot = {
  id: string;
  targetOutlineId: string;
  label: string;
  content: string;
  purpose: string;
  placement?: string;
};

export type DraftVersion = {
  id: string;
  label: string;
  content: string;
};

export const FORMATTING_BLOCK_TYPES = [
  "paragraph",
  "heading",
  "quote",
  "pain",
  "transition",
  "list",
  "comparison",
  "cta",
] as const;

export type FormattingBlockType = (typeof FORMATTING_BLOCK_TYPES)[number];

export type FormattingBlock = {
  id: string;
  type: FormattingBlockType;
  text: string;
};

export const WECHAT_FORMAT_THEMES = [
  "spring-fresh",
  "autumn-warm",
  "ocean-calm",
  "claude-warm-paper",
  "editorial-paper",
] as const;

export type WechatFormatTheme = (typeof WECHAT_FORMAT_THEMES)[number];

export type MetaCard = {
  id: string;
  label: string;
  content: string;
};

export type WorkflowState = {
  workflowId: string;
  currentStep: WorkflowStep;
  ideaInput: string;
  structureType: StructureType;
  searchSettings: SearchSettings;
  topicSearchContext: import("@/lib/search/types").SearchReferenceBundle | null;
  topicOptions: TopicOption[];
  selectedTopicId: string | null;
  brief: Brief | null;
  outline: OutlineSection[];
  materialSlots: MaterialSlot[];
  draftVersions: DraftVersion[];
  selectedDraftVersionId: string | null;
  titleOptions: MetaCard[];
  summaryOptions: MetaCard[];
  coverSuggestion: string | null;
  coverImagePrompt: string | null;
  finalSelection: {
    draftVersionId: string | null;
    titleId: string | null;
    summaryId: string | null;
  };
};

export type WorkflowEvent =
  | { type: "idea_updated"; idea: string }
  | {
      type: "topics_generated";
      topics: TopicOption[];
      searchContext?: import("@/lib/search/types").SearchReferenceBundle;
    }
  | { type: "topic_selected"; topicId: string }
  | { type: "brief_loaded"; brief: Brief }
  | { type: "brief_updated"; brief: Brief }
  | { type: "structure_type_updated"; structureType: StructureType }
  | { type: "brief_confirmed" }
  | {
      type: "outline_generated";
      outline: OutlineSection[];
      materialSlots: MaterialSlot[];
    }
  | {
      type: "drafts_generated";
      drafts: DraftVersion[];
      searchContext?: import("@/lib/search/types").SearchReferenceBundle;
    }
  | { type: "draft_formatted"; draft: DraftVersion }
  | { type: "draft_materials_completed"; draft: DraftVersion }
  | {
      type: "draft_updated";
      draftVersionId: string;
      content: string;
    }
  | {
      type: "meta_generated";
      titles: MetaCard[];
      summaries: MetaCard[];
      coverSuggestion: string;
      coverImagePrompt: string;
    }
  | { type: "final_version_selected"; draftVersionId: string }
  | { type: "final_title_selected"; titleId: string }
  | { type: "final_summary_selected"; summaryId: string }
  | { type: "go_to_step"; step: WorkflowStep };
