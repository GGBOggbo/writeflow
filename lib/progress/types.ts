export type WorkflowProgressStepId =
  | "search_query_built"
  | "web_search_started"
  | "web_search_completed"
  | "results_normalized"
  | "engagement_enrichment_started"
  | "engagement_enrichment_completed"
  | "deep_dive_started"
  | "deep_dive_completed"
  | "topics_generation_started"
  | "topics_generation_completed"
  | "brief_generation_started"
  | "brief_generation_completed"
  | "outline_generation_started"
  | "outline_generation_completed"
  | "benchmark_summary_started"
  | "benchmark_summary_completed"
  | "draft_generation_started"
  | "draft_generation_completed"
  | "draft_humanization_started"
  | "draft_humanization_completed"
  | "meta_generation_started"
  | "meta_generation_completed";

export type WorkflowProgressEvent = {
  stepId: WorkflowProgressStepId;
  label: string;
  detail?: string;
};

export type ProgressReporter = (event: WorkflowProgressEvent) => void;
