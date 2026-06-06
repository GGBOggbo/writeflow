import type {
  GenerateBriefInput,
  GenerateBriefOutput,
  GenerateDraftInput,
  GenerateDraftOutput,
  GenerateOutlineInput,
  GenerateOutlineOutput,
  GenerateTitlesAndSummariesInput,
  GenerateTitlesAndSummariesOutput,
  GenerateTopicsInput,
  GenerateTopicsOutput,
} from "@/types/ai";
import type { SearchResult } from "@/lib/search/types";
import type { benchmarkSummaryResponseSchema } from "./schemas";

export type BenchmarkSummaryOutput = ReturnType<
  typeof benchmarkSummaryResponseSchema.parse
>;

export type AIProviderName = "mock" | "openai" | "anthropic" | "mimo";
export type RealAIProviderName = Exclude<AIProviderName, "mock">;

export interface AIProvider {
  summarizeBenchmarks(results: SearchResult[]): Promise<BenchmarkSummaryOutput>;
  generateTopics(input: GenerateTopicsInput): Promise<GenerateTopicsOutput>;
  generateBrief(input: GenerateBriefInput): Promise<GenerateBriefOutput>;
  generateOutline(input: GenerateOutlineInput): Promise<GenerateOutlineOutput>;
  generateDraft(input: GenerateDraftInput): Promise<GenerateDraftOutput>;
  generateTitlesAndSummaries(
    input: GenerateTitlesAndSummariesInput
  ): Promise<GenerateTitlesAndSummariesOutput>;
}
