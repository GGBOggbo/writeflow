import type {
  Brief,
  DraftVersion,
  FormattingBlock,
  MaterialSlot,
  MetaCard,
  OutlineSection,
  TopicOption,
} from "./workflow";
import type {
  SearchBundleStatus,
  SearchMode,
  SearchReferenceBundle,
} from "@/lib/search/types";

export type GenerateTopicsInput = {
  idea: string;
  searchEnabled?: boolean;
  searchMode?: SearchMode;
  searchContext?: SearchReferenceBundle | null;
};

export type GenerateTopicsOutput = {
  topics: TopicOption[];
  searchStatus?: SearchBundleStatus;
  searchContext?: SearchReferenceBundle;
};

export type GenerateBriefInput = {
  topicId: string;
  topicLabel: string;
  topicAngle: string;
  coreViewpoint: string;
  targetAudience: string;
  reason: string;
  structureType: string;
  searchEnabled?: boolean;
  searchMode?: SearchMode;
  searchContext?: SearchReferenceBundle | null;
};

export type GenerateBriefOutput = {
  brief: Brief;
  searchStatus?: SearchBundleStatus;
};

export type GenerateOutlineInput = {
  topicId: string;
  topicLabel: string;
  topicAngle: string;
  coreViewpoint: string;
  targetAudience: string;
  reason: string;
  structureType: string;
  briefObjective: string;
  briefAudience: string;
  briefPersona: string;
  briefTone: string;
  briefDropOffPoint: string;
  briefConstraints: string[];
  searchEnabled?: boolean;
  searchMode?: SearchMode;
  searchContext?: SearchReferenceBundle | null;
};

export type GenerateOutlineOutput = {
  outline: OutlineSection[];
  materialSlots: MaterialSlot[];
  searchStatus?: SearchBundleStatus;
};

export type GenerateDraftInput = {
  topicId: string;
  topicLabel: string;
  topicAngle: string;
  coreViewpoint: string;
  targetAudience: string;
  reason: string;
  structureType: string;
  briefObjective: string;
  briefAudience: string;
  briefPersona: string;
  briefTone: string;
  briefDropOffPoint: string;
  briefConstraints: string[];
  outline: OutlineSection[];
  materialSlots: MaterialSlot[];
  searchEnabled?: boolean;
  searchMode?: SearchMode;
  searchContext?: SearchReferenceBundle | null;
};

export type GenerateDraftOutput = {
  drafts: DraftVersion[];
  searchContext?: SearchReferenceBundle;
};

export type HumanizeDraftInput = {
  draft: DraftVersion;
  coreViewpoint: string;
  briefPersona: string;
  briefTone: string;
  briefDropOffPoint: string;
};

export type HumanizeDraftOutput = {
  draft: DraftVersion;
};

export type HumanizeDraftsInput = {
  drafts: DraftVersion[];
  coreViewpoint: string;
  briefPersona: string;
  briefTone: string;
  briefDropOffPoint: string;
};

export type HumanizeDraftsOutput = {
  drafts: DraftVersion[];
};

export type FormatDraftInput = {
  draftVersionId: string;
  content: string;
};

export type FormatDraftOutput = {
  draftVersionId: string;
  blocks: FormattingBlock[];
};

export type CoverImageConcept = {
  /** 画面画什么(场景/物件/隐喻),可不带人物 */
  visualConcept: string;
  /** 情绪 + 光线方向(氛围、时段、光质) */
  mood: string;
  /** 焦点主体(必须完整保留、不可裁切) */
  focalObject: string;
  /** 克制的 2-3 色基调 */
  palette: string;
  /** 标题是否压图 */
  titleOverlay: "none" | "tag" | "title";
  /** 概念专属的"不要"(可选) */
  customNegatives?: string;
};

export type GenerateTitlesAndSummariesInput = {
  topicLabel: string;
  coreViewpoint: string;
  topicAngle: string;
  structureType: string;
  briefObjective: string;
  briefAudience: string;
  briefPersona: string;
  briefDropOffPoint: string;
  draftContent: string;
  searchEnabled?: boolean;
  searchMode?: SearchMode;
  searchContext?: SearchReferenceBundle | null;
};

export type GenerateTitlesAndSummariesOutput = {
  titles: MetaCard[];
  summaries: MetaCard[];
  coverSuggestion: string;
  coverImagePrompt: string;
  searchStatus?: SearchBundleStatus;
};
