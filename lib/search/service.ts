import { log } from "@/lib/debug";
import type { ProgressReporter } from "@/lib/progress/types";
import { buildSearchReferenceBundle } from "./normalize";
import { disabledSearchProvider } from "./disabled-provider";
import { genericSearchProvider } from "./generic-provider";
import { jizhilaSearchProvider } from "./jizhila-provider";
import type {
  SearchFreshness,
  SearchIntent,
  SearchMode,
  SearchReferenceBundle,
  SearchSortType,
} from "./types";

function getSearchProvider() {
  const providerName = process.env.SEARCH_PROVIDER?.trim().toLowerCase();

  if (providerName === "bocha") {
    return genericSearchProvider;
  }

  if (providerName === "jizhila") {
    return jizhilaSearchProvider;
  }

  return disabledSearchProvider;
}

const SEARCH_NOISE_WORDS = new Set([
  "我想写",
  "我想写一篇",
  "如何",
  "怎么",
  "怎样",
  "为什么",
  "很多人",
  "不是",
  "但是",
  "最后",
  "一个",
  "一篇",
  "内容",
  "关于",
  "做成",
  "可以",
  "复用",
  "流程",
  "最新",
  "公众号",
  "选题",
  "爆款",
  "摘要",
]);

const TOPIC_DOMAIN_TERMS = [
  "AI",
  "AI写作",
  "提示词",
  "智能体",
  "自动化",
  "工作流",
  "ChatGPT",
  "Claude",
  "编程",
  "副业",
  "赚钱",
  "小产品",
  "变现",
  "职场",
  "创业",
  "教育",
  "本地生活",
  "奶茶店",
  "小红书",
  "公众号",
];

const TOPIC_AUDIENCE_TERMS = [
  "宝妈",
  "普通人",
  "新手",
  "职场人",
  "创业者",
  "老板",
  "学生",
  "中年人",
  "35岁",
  "内容创作者",
  "产品经理",
];

const TOPIC_PAIN_TERMS = [
  "焦虑",
  "迷茫",
  "没时间",
  "在家",
  "赚不到钱",
  "不会做",
  "没人看",
  "转化低",
  "关门",
  "失业",
  "做不出",
  "很累",
  "带娃",
];

function getFreshnessForIntent(intent: SearchIntent): SearchFreshness {
  if (intent === "topics" || intent === "meta") {
    return "pastMonth";
  }

  return "past6Months";
}

function getSortTypeForIntent(intent: SearchIntent): SearchSortType {
  if (intent === "topics" || intent === "meta") {
    return "hot";
  }

  return "comprehensive";
}

function normalizeSearchText(input: string) {
  return input.replace(/[，。、“”"'！？!?,.:;：；（）()【】\[\]\n\r\t]+/g, " ").replace(/\s+/g, " ").trim();
}

function extractCoreTerms(input: string) {
  const normalized = normalizeSearchText(input);
  const longChunks = normalized.match(/[\u4e00-\u9fa5A-Za-z0-9]{2,16}/g) ?? [];

  return longChunks.filter((chunk) => !SEARCH_NOISE_WORDS.has(chunk));
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function compactTerms(terms: string[], maxTerms = 4) {
  return unique(
    terms
      .map((term) => term.trim())
      .filter(Boolean)
      .filter((term) => term.length >= 2)
  ).slice(0, maxTerms);
}

function buildKeywordQuery(baseTerms: string[], suffixTerms: string[], maxBaseTerms = 4) {
  return [...compactTerms(baseTerms, maxBaseTerms), ...suffixTerms].join(" ");
}

function findTermsByDictionary(input: string, dictionary: string[]) {
  return dictionary.filter((term) => input.includes(term));
}

function buildLongTopicTerms(idea: string) {
  const normalized = normalizeSearchText(idea);
  const domainTerms = findTermsByDictionary(normalized, TOPIC_DOMAIN_TERMS);
  const audienceTerms = findTermsByDictionary(normalized, TOPIC_AUDIENCE_TERMS);
  const painTerms = findTermsByDictionary(normalized, TOPIC_PAIN_TERMS);

  if (
    normalized.includes("想赚") ||
    normalized.includes("零花钱") ||
    normalized.includes("端盘子")
  ) {
    domainTerms.push("副业");
  }

  const semanticTerms = [
    ...domainTerms.slice(0, 4),
    ...audienceTerms.slice(0, 2),
    ...painTerms.slice(0, 2),
  ];
  const fallbackTerms = semanticTerms.length >= 3 ? [] : extractCoreTerms(normalized);

  return compactTerms([...semanticTerms, ...fallbackTerms], 6);
}

function createEmptyBundle(
  status: "degraded" | "empty",
  query: string,
  intent: SearchIntent,
  freshness: SearchFreshness
): SearchReferenceBundle {
  return {
    status,
    query,
    intent,
    freshness,
    results: [],
    seoKeywords: [],
    crowdedness: "low",
    staleBuzzwords: [],
    notes: [],
  };
}

async function fetchAndNormalize(
  query: string,
  intent: SearchIntent,
  mode: SearchMode,
  onProgress?: ProgressReporter
): Promise<SearchReferenceBundle> {
  const freshness = getFreshnessForIntent(intent);
  const sortType = getSortTypeForIntent(intent);
  const results = await getSearchProvider().search(
    {
      query,
      intent,
      mode,
      freshness,
      sortType,
    },
    onProgress
  );

  if (results.length === 0) {
    log.warn("search", `${intent} 搜索返回空结果`);
    return createEmptyBundle("empty", query, intent, freshness);
  }

  const bundle = buildSearchReferenceBundle(query, intent, results, freshness);
  log.info("search", `← ${intent} | status=${bundle.status} results=${bundle.results.length} crowded=${bundle.crowdedness}`);

  if (bundle.staleBuzzwords.length > 0 || bundle.crowdedness === "high") {
    log.warn("search", `${intent} 搜索质量预警`, {
      crowdedness: bundle.crowdedness,
      staleBuzzwords: bundle.staleBuzzwords,
    });
  }

  log.debug("search", `${intent} 搜索结果摘要`, bundle.results.map((r) => ({
    title: r.title,
    source: r.source,
    publishedAt: r.publishedAt,
  })));

  return bundle;
}

async function safeSearch(
  query: string,
  intent: SearchIntent,
  mode: SearchMode,
  onProgress?: ProgressReporter
): Promise<SearchReferenceBundle> {
  try {
    return await fetchAndNormalize(query, intent, mode, onProgress);
  } catch (err) {
    log.error("search", intent, err);
    return createEmptyBundle("degraded", query, intent, getFreshnessForIntent(intent));
  }
}

export function buildTopicsSearchQuery(idea: string) {
  const normalized = normalizeSearchText(idea);
  const terms =
    normalized.length > 30
      ? buildLongTopicTerms(normalized)
      : extractCoreTerms(normalized);

  return buildKeywordQuery(terms, ["痛点"], normalized.length > 30 ? 6 : 4);
}

function extractDraftSignalTerms(draftContent: string) {
  const normalized = normalizeSearchText(draftContent);
  const phraseMatches =
    normalized.match(/提示词[\u4e00-\u9fa5A-Za-z0-9]{0,8}/g) ?? [];

  return compactTerms(
    [...phraseMatches, ...extractCoreTerms(normalized.slice(0, 48))],
    2
  );
}

export function buildMetaSearchQuery(
  topicAngle: string,
  audience: string,
  draftContent = ""
) {
  return buildKeywordQuery(
    [
      ...extractCoreTerms(topicAngle),
      ...extractCoreTerms(audience),
      ...extractDraftSignalTerms(draftContent),
    ],
    ["痛点", "现状"]
  );
}

export function searchForTopics(
  idea: string,
  mode: SearchMode,
  onProgress?: ProgressReporter
) {
  const query = buildTopicsSearchQuery(idea);
  onProgress?.({
    stepId: "search_query_built",
    label: "拆解命题",
    detail: "捕捉话题信号",
  });
  return safeSearch(query, "topics", mode, onProgress);
}

export function buildBriefSearchQuery(topicLabel: string, topicAngle: string, coreViewpoint: string) {
  const excerpt = normalizeSearchText(coreViewpoint).slice(0, 18);
  return buildKeywordQuery(
    [...extractCoreTerms(topicLabel), ...extractCoreTerms(topicAngle), ...extractCoreTerms(excerpt)],
    ["人群", "痛点"]
  );
}

export function searchForBrief(topicLabel: string, topicAngle: string, coreViewpoint: string, mode: SearchMode) {
  return safeSearch(buildBriefSearchQuery(topicLabel, topicAngle, coreViewpoint), "brief", mode);
}

export function buildOutlineSearchQuery(topicLabel: string, briefObjective: string, briefAudience: string) {
  return buildKeywordQuery(
    [...extractCoreTerms(topicLabel), ...extractCoreTerms(briefObjective), ...extractCoreTerms(briefAudience)],
    ["结构", "大纲"]
  );
}

export function searchForOutline(topicLabel: string, briefObjective: string, briefAudience: string, mode: SearchMode) {
  return safeSearch(buildOutlineSearchQuery(topicLabel, briefObjective, briefAudience), "outline", mode);
}

export function searchForMeta(
  topicAngle: string,
  audience: string,
  draftContent: string,
  mode: SearchMode
) {
  return safeSearch(
    buildMetaSearchQuery(topicAngle, audience, draftContent),
    "meta",
    mode
  );
}
