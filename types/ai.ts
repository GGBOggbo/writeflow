import type {
  Brief,
  DraftVersion,
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
  searchStatus?: SearchBundleStatus;
};
