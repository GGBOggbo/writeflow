/**
 * AI service layer — SERVER-SIDE ONLY.
 *
 * This module reads `AI_PROVIDER` from env and calls the matching provider.
 * It must only be imported from API route handlers (`app/api/ai/*`) or
 * other server-side code. Frontend components should import from
 * `lib/ai/client.ts` instead, which calls the API routes.
 */

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
import type { SearchReferenceBundle, SearchResult } from "@/lib/search/types";
import type { ProgressReporter } from "@/lib/progress/types";
import { mockAIProvider } from "./mock-provider";
import { getProviderName } from "./provider-config";
import type { AIProvider } from "./provider";
import { createRealAIProvider } from "./real-provider";
import { searchForTopics } from "@/lib/search/service";
import {
  briefResponseSchema,
  draftResponseSchema,
  metaResponseSchema,
  outlineResponseSchema,
  topicResponseSchema,
} from "./schemas";

function getProvider(): AIProvider {
  const providerName = getProviderName();

  if (providerName === "mock") {
    return mockAIProvider;
  }

  return createRealAIProvider(providerName);
}

function getDeepDiveResults(searchContext: SearchReferenceBundle | null) {
  return (searchContext?.results ?? [])
    .filter((result) => result.articleHtml)
    .slice(0, 2);
}

function attachBenchmarkSummaries(
  searchContext: SearchReferenceBundle,
  results: SearchResult[]
): SearchReferenceBundle {
  const byUrl = new Map(results.map((result) => [result.url, result]));

  return {
    ...searchContext,
    results: searchContext.results.map((result) => byUrl.get(result.url) ?? result),
  };
}

async function summarizeDraftBenchmarks(
  provider: AIProvider,
  searchContext: SearchReferenceBundle | null,
  onProgress?: ProgressReporter
) {
  const deepDiveResults = getDeepDiveResults(searchContext).filter(
    (result) => !result.benchmarkSummary
  );

  if (!searchContext || deepDiveResults.length === 0) {
    return searchContext;
  }

  try {
    onProgress?.({
      stepId: "benchmark_summary_started",
      label: "AI 总结对标文",
      detail: `总结 ${deepDiveResults.length} 篇核心对标文`,
    });
    const summaryOutput = await provider.summarizeBenchmarks(deepDiveResults);
    const summariesByUrl = new Map(
      summaryOutput.summaries.map((summary) => [summary.url, summary])
    );
    const enrichedResults = deepDiveResults.map((result) => {
      const summary = summariesByUrl.get(result.url);

      return summary
        ? {
            ...result,
            benchmarkSummary: {
              userPain: summary.userPain,
              structurePattern: summary.structurePattern,
              rhythmNotes: summary.rhythmNotes,
              commentInsights: summary.commentInsights,
              reusableAngles: summary.reusableAngles,
              avoidCopying: summary.avoidCopying,
            },
          }
        : result;
    });

    const enrichedContext = attachBenchmarkSummaries(searchContext, enrichedResults);
    onProgress?.({
      stepId: "benchmark_summary_completed",
      label: "AI 总结对标文完成",
      detail: "已提炼卡点、结构和评论洞察",
    });
    return enrichedContext;
  } catch {
    return searchContext;
  }
}

export async function generateTopics(
  input: GenerateTopicsInput,
  options?: { onProgress?: ProgressReporter }
): Promise<GenerateTopicsOutput> {
  const searchResult = input.searchEnabled
    ? await searchForTopics(input.idea, input.searchMode ?? "default", options?.onProgress)
    : null;
  const searchContext =
    searchResult?.status === "success" ? searchResult : null;

  options?.onProgress?.({
    stepId: "topics_generation_started",
    label: "生成选题",
    detail: "把搜索参考压进 3 个方向",
  });
  const providerResult = await getProvider().generateTopics({
    ...input,
    searchContext,
  });
  options?.onProgress?.({
    stepId: "topics_generation_completed",
    label: "生成选题完成",
  });

  return topicResponseSchema.parse({
    ...providerResult,
    searchStatus: searchResult?.status,
    searchContext: searchContext ?? undefined,
  });
}

export async function generateBrief(
  input: GenerateBriefInput,
  options?: { onProgress?: ProgressReporter }
): Promise<GenerateBriefOutput> {
  const searchContext =
    input.searchEnabled && input.searchContext?.status === "success"
      ? input.searchContext
      : null;

  options?.onProgress?.({
    stepId: "brief_generation_started",
    label: "形成策略单",
    detail: "生成目标、读者、人设、语气和落脚点",
  });
  const providerResult = await getProvider().generateBrief({
    ...input,
    searchContext,
  });
  options?.onProgress?.({
    stepId: "brief_generation_completed",
    label: "形成策略单完成",
  });

  return briefResponseSchema.parse({
    ...providerResult,
    searchStatus: searchContext?.status,
  });
}

export async function generateOutline(
  input: GenerateOutlineInput,
  options?: { onProgress?: ProgressReporter }
): Promise<GenerateOutlineOutput> {
  const searchContext =
    input.searchEnabled && input.searchContext?.status === "success"
      ? input.searchContext
      : null;

  options?.onProgress?.({
    stepId: "outline_generation_started",
    label: "拆正文骨架",
    detail: "生成结构节点和素材槽位",
  });
  const providerResult = await getProvider().generateOutline({
    ...input,
    searchContext,
  });
  options?.onProgress?.({
    stepId: "outline_generation_completed",
    label: "拆正文骨架完成",
  });

  return outlineResponseSchema.parse({
    ...providerResult,
    searchStatus: searchContext?.status,
  });
}

export async function generateDraft(
  input: GenerateDraftInput,
  options?: { onProgress?: ProgressReporter }
): Promise<GenerateDraftOutput> {
  const provider = getProvider();
  const searchContext =
    input.searchEnabled && input.searchContext?.status === "success"
      ? input.searchContext
      : null;
  const enrichedSearchContext = await summarizeDraftBenchmarks(
    provider,
    searchContext,
    options?.onProgress
  );

  options?.onProgress?.({
    stepId: "draft_generation_started",
    label: "生成正文初稿",
    detail: "按大纲、人设和对标总结组装正文",
  });
  const providerResult = await provider.generateDraft({
    ...input,
    searchContext: enrichedSearchContext,
  });
  options?.onProgress?.({
    stepId: "draft_generation_completed",
    label: "生成正文初稿完成",
  });

  return draftResponseSchema.parse({
    ...providerResult,
    searchContext: enrichedSearchContext ?? undefined,
  });
}

export async function generateTitlesAndSummaries(
  input: GenerateTitlesAndSummariesInput,
  options?: { onProgress?: ProgressReporter }
): Promise<GenerateTitlesAndSummariesOutput> {
  const searchContext =
    input.searchEnabled && input.searchContext?.status === "success"
      ? input.searchContext
      : null;

  options?.onProgress?.({
    stepId: "meta_generation_started",
    label: "生成标题摘要",
    detail: "拆 5 类标题、3 条摘要和封面建议",
  });
  const providerResult = await getProvider().generateTitlesAndSummaries({
    ...input,
    searchContext,
  });
  options?.onProgress?.({
    stepId: "meta_generation_completed",
    label: "生成标题摘要完成",
  });

  return metaResponseSchema.parse({
    ...providerResult,
    searchStatus: searchContext?.status,
  });
}
