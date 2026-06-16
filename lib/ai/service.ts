/**
 * AI service layer — SERVER-SIDE ONLY.
 *
 * This module reads `AI_PROVIDER` from env and calls the matching provider.
 * It must only be imported from API route handlers (`app/api/ai/*`) or
 * other server-side code. Frontend components should import from
 * `lib/ai/client.ts` instead, which calls the API routes.
 */

import type {
  CompleteDraftMaterialsInput,
  CompleteDraftMaterialsOutput,
  FormatDraftInput,
  FormatDraftOutput,
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
import { log } from "@/lib/debug";
import {
  buildFallbackTopicSearchPlan,
  topicSearchPlanSchema,
} from "@/lib/search/topic-search-plan";
import type { TopicSearchPlan } from "@/lib/search/topic-search-plan";
import {
  briefResponseSchema,
  completeDraftMaterialsResponseSchema,
  draftResponseSchema,
  formatDraftResponseSchema,
  metaResponseSchema,
  outlineResponseSchema,
  topicResponseSchema,
} from "./schemas";
import { formatSearchReference } from "./prompts/search-context";
import {
  buildBasicMarkdownFallback,
  layoutDraftModules,
} from "./draft-module-layout";

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

function stripTerms(value: string, terms: string[]) {
  return terms
    .reduce(
      (text, term) =>
        text.replace(new RegExp(`(?:^|\\s)${term}(?=\\s|$)`, "g"), " "),
      value
    )
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeAddedNumericTerms(
  plan: TopicSearchPlan,
  idea: string,
  terms: string[]
): TopicSearchPlan {
  if (terms.length === 0) {
    return plan;
  }

  const fallback = buildFallbackTopicSearchPlan(idea);
  const historyKeyword = stripTerms(plan.historyKeyword, terms) || fallback.historyKeyword;
  const realtimeKeyword = stripTerms(plan.realtimeKeyword, terms) || fallback.realtimeKeyword;
  const requiredTerms = plan.requiredTerms
    .map((term) => stripTerms(term, terms))
    .filter(Boolean);
  const relatedTerms = plan.relatedTerms
    .map((term) => stripTerms(term, terms))
    .filter(Boolean);

  return topicSearchPlanSchema.parse({
    ...plan,
    historyKeyword,
    realtimeKeyword,
    requiredTerms: requiredTerms.length > 0 ? requiredTerms : fallback.requiredTerms,
    relatedTerms,
  });
}

function topicReferenceStats(
  searchContext: SearchReferenceBundle | null,
  promptReferenceLimit = 4
) {
  const results = searchContext?.results ?? [];
  const promptResults = results.slice(0, promptReferenceLimit);
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

function reusableSearchContext(
  scope: "brief" | "outline" | "draft" | "meta",
  searchEnabled: boolean | undefined,
  searchContext: SearchReferenceBundle | null | undefined
) {
  const reusable =
    searchEnabled && searchContext?.status === "success"
      ? searchContext
      : null;

  if (!searchEnabled) {
    log.info(scope, "search context disabled", {
      event: "search.context.disabled",
      stage: scope,
    });
    return null;
  }

  if (!reusable) {
    log.warn(scope, "search context missing", {
      event: "search.context.missing",
      stage: scope,
      status: searchContext?.status ?? "missing",
    });
    return null;
  }

  log.info(scope, "search context reused", {
    event: "search.context.reused",
    stage: scope,
    ...topicReferenceStats(reusable, scope === "draft" ? 8 : 4),
    status: reusable.status,
  });

  return reusable;
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
    .slice(0, 8);
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
    event: "topics.generation.started",
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
        event: "search.plan.fallback",
        source: plannerSource,
        errorType: safeErrorType(error),
      });
    }
    plannerMs = Date.now() - plannerStartedAt;
    const addedTerms = addedNumericTerms(input.idea, topicPlan);
    topicPlan = sanitizeAddedNumericTerms(topicPlan, input.idea, addedTerms);

    log.debug("topics", "search plan", {
      event: "search.plan.completed",
      source: plannerSource,
      elapsedMs: plannerMs,
      coreTopic: logPreview(topicPlan.coreTopic),
      historyKeyword: logPreview(topicPlan.historyKeyword),
      realtimeKeyword: logPreview(topicPlan.realtimeKeyword),
      requiredTerms: topicPlan.requiredTerms.map((term) => logPreview(term, 80)),
      relatedTerms: topicPlan.relatedTerms.map((term) => logPreview(term, 80)),
      excludedTerms: topicPlan.excludedTerms.map((term) => logPreview(term, 80)),
      addedTerms,
      sanitizedTerms: addedTerms,
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
    event: "search.context.prepared",
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
    event: "topics.generation.completed",
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
  const searchContext = reusableSearchContext(
    "brief",
    input.searchEnabled,
    input.searchContext
  );

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
  const searchContext = reusableSearchContext(
    "outline",
    input.searchEnabled,
    input.searchContext
  );

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
  const searchContext = reusableSearchContext(
    "draft",
    input.searchEnabled,
    input.searchContext
  );
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

export async function formatDraft(
  input: FormatDraftInput,
  options?: { onProgress?: ProgressReporter }
): Promise<FormatDraftOutput> {
  const provider = getProvider();
  const startedAt = Date.now();

  options?.onProgress?.({
    stepId: "markdown_formatting_started",
    label: "AI 整理 Markdown 与模块",
    detail: "按公众号手机阅读节奏整理结构和重点",
  });

  const layout = await layoutDraftModules(
    input.draft.content,
    (content, layoutOptions) =>
      layoutOptions
        ? provider.formatDraftMarkdown(content, layoutOptions)
        : provider.formatDraftMarkdown(content)
  );

  if (layout.source === "local_fallback") {
    log.warn("draft", "Local Markdown fallback completed", {
      event: "draft.markdown.fallback.completed",
      status: "degraded",
      source: layout.source,
      attempts: layout.attempts,
      failures: layout.failures,
      moduleCount: layout.moduleCount,
      moduleNames: layout.moduleNames,
      ctaCount: layout.ctaCount,
      degradedModules: layout.degradedModules,
      degradationReasons: layout.degradationReasons,
      durationMs: Date.now() - startedAt,
      inputChars: input.draft.content.length,
      outputChars: layout.content.length,
    });
    options?.onProgress?.({
      stepId: "markdown_formatting_degraded",
      label: "AI 排版未通过，已使用本地基础排版",
    });
  } else {
    log.info("draft", "Markdown formatting completed", {
      event: "draft.markdown.completed",
      status: "success",
      source: layout.source,
      attempts: layout.attempts,
      failures: layout.failures,
      moduleCount: layout.moduleCount,
      moduleNames: layout.moduleNames,
      ctaCount: layout.ctaCount,
      degradedModules: layout.degradedModules,
      degradationReasons: layout.degradationReasons,
      durationMs: Date.now() - startedAt,
      inputChars: input.draft.content.length,
      outputChars: layout.content.length,
    });
    options?.onProgress?.({
      stepId: "markdown_formatting_completed",
      label: "AI 排版完成",
    });
  }

  return formatDraftResponseSchema.parse({
    draft: {
      ...input.draft,
      id: `${input.draft.id}-formatted-${crypto.randomUUID()}`,
      label: "排版版",
      content: layout.content,
    },
  });
}

const MATERIAL_PLACEHOLDER_PATTERN = /【💡需要你补充：[^】]+】/g;

function assertMaterialCompletionPreservesDraft(
  source: string,
  candidate: string
) {
  const placeholders = source.match(MATERIAL_PLACEHOLDER_PATTERN) ?? [];
  if (placeholders.length === 0) {
    throw new Error("当前正文没有需要补充的素材占位符。");
  }

  const fixedSegments = source.split(MATERIAL_PLACEHOLDER_PATTERN);
  let cursor = 0;

  if (!candidate.startsWith(fixedSegments[0] ?? "")) {
    throw new Error("AI 补充素材改变了占位符之外的正文。");
  }
  cursor = (fixedSegments[0] ?? "").length;

  for (let index = 0; index < placeholders.length; index += 1) {
    const nextFixed = fixedSegments[index + 1] ?? "";
    const nextIndex = nextFixed
      ? candidate.indexOf(nextFixed, cursor)
      : candidate.length;

    if (nextIndex < cursor) {
      throw new Error("AI 补充素材改变了占位符之外的正文。");
    }

    const replacement = candidate.slice(cursor, nextIndex).trim();
    const placeholder = placeholders[index] ?? "";
    if (
      replacement !== placeholder &&
      replacement.replace(/\s+/g, "").length < 12
    ) {
      throw new Error("AI 删除了素材占位符，但没有提供有效内容。");
    }

    cursor = nextIndex + nextFixed.length;
  }

  if (cursor !== candidate.length) {
    throw new Error("AI 补充素材改变了占位符之外的正文。");
  }
}

export async function completeDraftMaterials(
  input: CompleteDraftMaterialsInput,
  options?: { onProgress?: ProgressReporter }
): Promise<CompleteDraftMaterialsOutput> {
  options?.onProgress?.({
    stepId: "draft_material_completion_started",
    label: "补充正文素材",
    detail: "只补写有现有资料支持的内容",
  });

  const providerResult = await getProvider().completeDraftMaterials(input);
  const completed = providerResult.drafts[0];
  if (!completed?.content.trim()) {
    throw new Error("AI 补充素材没有返回正文。");
  }

  assertMaterialCompletionPreservesDraft(input.draft.content, completed.content);
  if (MATERIAL_PLACEHOLDER_PATTERN.test(completed.content)) {
    MATERIAL_PLACEHOLDER_PATTERN.lastIndex = 0;
    throw new Error("AI 补充后的正文仍然包含需要补充的素材占位符。");
  }
  MATERIAL_PLACEHOLDER_PATTERN.lastIndex = 0;

  options?.onProgress?.({
    stepId: "draft_material_completion_completed",
    label: "正文素材补充完成",
  });

  const normalizedContent = buildBasicMarkdownFallback(completed.content);

  return completeDraftMaterialsResponseSchema.parse({
    draft: {
      ...completed,
      content: normalizedContent,
      id: `${input.draft.id}-materials-${crypto.randomUUID()}`,
      label: "AI 补充版",
    },
  });
}

export async function generateTitlesAndSummaries(
  input: GenerateTitlesAndSummariesInput,
  options?: { onProgress?: ProgressReporter }
): Promise<GenerateTitlesAndSummariesOutput> {
  const searchContext = reusableSearchContext(
    "meta",
    input.searchEnabled,
    input.searchContext
  );

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
