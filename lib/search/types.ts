export type SearchSource = "wechat" | "xiaohongshu" | "hotlist" | "generic";

export type SearchIntent = "topics" | "brief" | "outline" | "meta";

export type SearchMode = "default" | "manual";

export type SearchFreshness =
  | "noLimit"
  | "pastDay"
  | "pastWeek"
  | "pastMonth"
  | "past6Months";

export type SearchSortType = "comprehensive" | "latest" | "hot";

export type SearchBundleStatus = "success" | "degraded" | "empty";

export type SearchEngagementMetrics = {
  readCount?: number;
  likeCount?: number;
  lookingCount?: number;
  shareCount?: number;
  collectCount?: number;
  commentCount?: number;
};

export type SearchArticleComment = {
  content: string;
  likeCount?: number;
  isTop?: boolean;
  createdAt?: string;
};

export type SearchQualitySignals = {
  candidateScore?: number;
  stableScore?: number;
  anomalyScore?: number;
  reasons?: string[];
};

export type SearchBenchmarkSummary = {
  userPain: string;
  structurePattern: string;
  rhythmNotes: string;
  commentInsights: string[];
  reusableAngles: string[];
  avoidCopying: string[];
};

export type SearchResult = {
  title: string;
  snippet: string;
  url: string;
  publishedAt?: string;
  source: SearchSource;
  engagementMetrics?: SearchEngagementMetrics;
  articleHtml?: string;
  comments?: SearchArticleComment[];
  qualitySignals?: SearchQualitySignals;
  benchmarkSummary?: SearchBenchmarkSummary;
  seoKeywords?: string[];
  crowdedness?: "low" | "medium" | "high";
  staleBuzzwords?: string[];
  notes?: string[];
};

export type SearchReferenceBundle = {
  status: SearchBundleStatus;
  query: string;
  intent: SearchIntent;
  freshness: SearchFreshness;
  results: SearchResult[];
  seoKeywords: string[];
  crowdedness: "low" | "medium" | "high";
  staleBuzzwords: string[];
  notes: string[];
};

export type SearchQueryInput = {
  query: string;
  intent: SearchIntent;
  mode: SearchMode;
  freshness: SearchFreshness;
  sortType: SearchSortType;
};
