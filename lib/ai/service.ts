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
  HumanizeDraftInput,
  HumanizeDraftOutput,
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
import { log } from "@/lib/debug";
import {
  buildFallbackTopicSearchPlan,
  topicSearchPlanSchema,
} from "@/lib/search/topic-search-plan";
import type { TopicSearchPlan } from "@/lib/search/topic-search-plan";
import {
  briefResponseSchema,
  draftResponseSchema,
  humanizeDraftResponseSchema,
  metaResponseSchema,
  outlineResponseSchema,
  topicResponseSchema,
} from "./schemas";
import { formatSearchReference } from "./prompts/search-context";

function logPreview(value: string, limit = 120) {
  return value.replace(/[\n\r\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);
}

function safeErrorType(error: unknown) {
  return error instanceof Error ? error.name : typeof error;
}

function addedNumericTerms(input: string, plan: TopicSearchPlan) {
  const inputTerms = new Set(input.match(/\b(?:19|20)\d{2}\b/g) ?? []);
  const plannedText = [
    plan.historyKeyword,
    plan.realtimeKeyword,
    ...plan.requiredTerms,
    ...plan.relatedTerms,
  ].join(" ");

  return [...new Set(plannedText.match(/\b(?:19|20)\d{2}\b/g) ?? [])]
    .filter((term) => !inputTerms.has(term));
}

function topicReferenceStats(searchContext: SearchReferenceBundle | null) {
  const results = searchContext?.results ?? [];
  const promptResults = results.slice(0, 4);
  const history = results.filter((result) => Boolean(result.engagementMetrics)).length;

  return {
    searchResults: results.length,
    history,
    realtime: results.length - history,
    promptReferences: promptResults.length,
    withHtml: results.filter((result) => Boolean(result.articleHtml)).length,
    withComments: results.filter((result) => Boolean(result.comments?.length)).length,
    contextChars: promptResults
      .map((result, index) => formatSearchReference(result, index))
      .join("\n")
      .length,
  };
}

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

function extractMaterialPlaceholders(content: string) {
  return content.match(/【💡需要你补充：[^】]*】/g) ?? [];
}

function assertHumanizedDraftsPreserveSource(
  source: GenerateDraftOutput["drafts"],
  humanized: GenerateDraftOutput["drafts"]
) {
  if (source.length !== humanized.length) {
    throw new Error("去 AI 润色改变了正文版本数量。");
  }

  source.forEach((draft, index) => {
    const rewritten = humanized[index];

    if (
      !rewritten ||
      rewritten.id !== draft.id ||
      rewritten.label !== draft.label
    ) {
      throw new Error("去 AI 润色改变了正文版本身份。");
    }

    const sourcePlaceholders = extractMaterialPlaceholders(draft.content);
    const rewrittenPlaceholders = extractMaterialPlaceholders(rewritten.content);

    if (
      sourcePlaceholders.length !== rewrittenPlaceholders.length ||
      sourcePlaceholders.some(
        (placeholder, placeholderIndex) =>
          rewrittenPlaceholders[placeholderIndex] !== placeholder
      )
    ) {
      throw new Error("去 AI 润色改变了素材占位符。");
    }
  });
}

function labelOriginalDrafts(drafts: GenerateDraftOutput["drafts"]) {
  return drafts.map((draft) => ({
    ...draft,
    label: "原始版",
  }));
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
  const totalStartedAt = Date.now();
  const provider = getProvider();
  let topicPlan: TopicSearchPlan | undefined;
  let plannerMs = 0;
  let searchMs = 0;

  log.info("topics", "start", {
    ideaPreview: logPreview(input.idea),
    searchEnabled: Boolean(input.searchEnabled),
    aiProvider: getProviderName(),
    searchProvider: process.env.SEARCH_PROVIDER?.trim().toLowerCase() || "jizhila",
  });

  if (input.searchEnabled) {
    options?.onProgress?.({
      stepId: "topic_search_planning_started",
      label: "理解创作意图",
      detail: "提炼核心主题、实体和搜索边界",
    });

    const plannerStartedAt = Date.now();
    let plannerSource: "ai" | "fallback" = "ai";
    try {
      topicPlan = topicSearchPlanSchema.parse(
        await provider.planTopicSearch(input.idea)
      );
    } catch (error) {
      plannerSource = "fallback";
      topicPlan = buildFallbackTopicSearchPlan(input.idea);
      log.warn("topics", "search plan fallback", {
        source: plannerSource,
        errorType: safeErrorType(error),
      });
    }
    plannerMs = Date.now() - plannerStartedAt;

    log.debug("topics", "search plan", {
      source: plannerSource,
      elapsedMs: plannerMs,
      coreTopic: logPreview(topicPlan.coreTopic),
      historyKeyword: logPreview(topicPlan.historyKeyword),
      realtimeKeyword: logPreview(topicPlan.realtimeKeyword),
      requiredTerms: topicPlan.requiredTerms.map((term) => logPreview(term, 80)),
      relatedTerms: topicPlan.relatedTerms.map((term) => logPreview(term, 80)),
      excludedTerms: topicPlan.excludedTerms.map((term) => logPreview(term, 80)),
      addedTerms: addedNumericTerms(input.idea, topicPlan),
    });

    options?.onProgress?.({
      stepId: "topic_search_planning_completed",
      label: "理解创作意图完成",
      detail: `核心主题：${topicPlan.coreTopic}`,
    });
  }

  const searchStartedAt = Date.now();
  const searchResult = input.searchEnabled
    ? await searchForTopics(
        input.idea,
        input.searchMode ?? "default",
        options?.onProgress,
        topicPlan
      )
    : null;
  searchMs = input.searchEnabled ? Date.now() - searchStartedAt : 0;
  const searchContext =
    searchResult?.status === "success" ? searchResult : null;

  log.info("topics", "reference context", {
    ...topicReferenceStats(searchContext),
    status: searchResult?.status ?? "disabled",
  });

  options?.onProgress?.({
    stepId: "topics_generation_started",
    label: "策划选题",
    detail: "融合参考素材，构思选题方向",
  });
  const generationStartedAt = Date.now();
  const providerResult = await provider.generateTopics({
    ...input,
    searchContext,
  });
  const generationMs = Date.now() - generationStartedAt;
  options?.onProgress?.({
    stepId: "topics_generation_completed",
    label: "策划选题完成",
  });

  const output = topicResponseSchema.parse({
    ...providerResult,
    searchStatus: searchResult?.status,
    searchContext: searchContext ?? undefined,
  });

  log.info("topics", "completed", {
    plannerMs,
    searchMs,
    generationMs,
    totalMs: Date.now() - totalStartedAt,
    topicCount: output.topics.length,
  });

  return output;
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
    drafts: labelOriginalDrafts(providerResult.drafts),
    searchContext: enrichedSearchContext ?? undefined,
  });
}

export async function humanizeDraft(
  input: HumanizeDraftInput,
  options?: { onProgress?: ProgressReporter }
): Promise<HumanizeDraftOutput> {
  options?.onProgress?.({
    stepId: "draft_humanization_started",
    label: "去掉机器腔",
    detail: "终审句式、节奏和表达痕迹",
  });

  const providerResult = await getProvider().humanizeDrafts({
    drafts: [input.draft],
    coreViewpoint: input.coreViewpoint,
    briefPersona: input.briefPersona,
    briefTone: input.briefTone,
    briefDropOffPoint: input.briefDropOffPoint,
  });
  assertHumanizedDraftsPreserveSource([input.draft], providerResult.drafts);
  const rewritten = providerResult.drafts[0];

  if (!rewritten) {
    throw new Error("去 AI 润色没有返回正文。");
  }

  options?.onProgress?.({
    stepId: "draft_humanization_completed",
    label: "去掉机器腔完成",
  });

  return humanizeDraftResponseSchema.parse({
    draft: {
      ...rewritten,
      id: `${input.draft.id}-humanized`,
      label: "去 AI 版",
    },
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
