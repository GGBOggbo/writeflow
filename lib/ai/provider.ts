import type {
  GenerateBriefInput,
  GenerateBriefOutput,
  GenerateDraftInput,
  GenerateDraftOutput,
  HumanizeDraftsInput,
  HumanizeDraftsOutput,
  GenerateOutlineInput,
  GenerateOutlineOutput,
  GenerateTitlesAndSummariesInput,
  GenerateTitlesAndSummariesOutput,
  GenerateTopicsInput,
  GenerateTopicsOutput,
} from "@/types/ai";
import type { SearchResult } from "@/lib/search/types";
import type { TopicSearchPlan } from "@/lib/search/topic-search-plan";
import type { benchmarkSummaryResponseSchema } from "./schemas";

export type BenchmarkSummaryOutput = ReturnType<
  typeof benchmarkSummaryResponseSchema.parse
>;

export type AIProviderName = "mock" | "openai" | "anthropic" | "mimo" | "deepseek";
export type RealAIProviderName = Exclude<AIProviderName, "mock">;

export interface AIProvider {
  planTopicSearch(idea: string): Promise<TopicSearchPlan>;
  summarizeBenchmarks(results: SearchResult[]): Promise<BenchmarkSummaryOutput>;
  generateTopics(input: GenerateTopicsInput): Promise<GenerateTopicsOutput>;
  generateBrief(input: GenerateBriefInput): Promise<GenerateBriefOutput>;
  generateOutline(input: GenerateOutlineInput): Promise<GenerateOutlineOutput>;
  generateDraft(input: GenerateDraftInput): Promise<GenerateDraftOutput>;
  humanizeDrafts(input: HumanizeDraftsInput): Promise<HumanizeDraftsOutput>;
  generateTitlesAndSummaries(
    input: GenerateTitlesAndSummariesInput
  ): Promise<GenerateTitlesAndSummariesOutput>;
}
