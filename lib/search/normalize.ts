import type {
  SearchEngagementMetrics,
  SearchReferenceBundle,
  SearchResult,
} from "./types";

const STALE_BUZZWORDS = [
  "杠杆",
  "底层逻辑",
  "护城河",
  "轻创业",
  "一人公司",
];

function scoreEngagement(metrics?: SearchEngagementMetrics) {
  if (!metrics) return 0;

  return (
    (metrics.readCount ?? 0) +
    (metrics.likeCount ?? 0) * 10 +
    (metrics.collectCount ?? 0) * 15 +
    (metrics.commentCount ?? 0) * 12
  );
}

function scoreReferencePriority(result: SearchResult) {
  return (
    (result.articleHtml ? 1_000_000 : 0) +
    (result.comments && result.comments.length > 0 ? 250_000 : 0) +
    (result.qualitySignals?.stableScore ?? 0) * 1_000 +
    (result.qualitySignals?.anomalyScore ?? 0) * 1_000 +
    scoreEngagement(result.engagementMetrics)
  );
}

function extractCandidateKeywords(text: string) {
  return (text.match(/[\u4e00-\u9fa5A-Za-z0-9]{2,16}/g) ?? [])
    .map((part) => part.trim())
    .filter(Boolean);
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

export function normalizeSearchResults(results: SearchResult[]) {
  return [...results].sort(
    (left, right) =>
      scoreReferencePriority(right) - scoreReferencePriority(left)
  );
}

export function extractSeoKeywords(query: string, results: SearchResult[]) {
  const keywords = unique([
    ...extractCandidateKeywords(query),
    ...results.flatMap((result) => [
      ...(result.seoKeywords ?? []),
      ...extractCandidateKeywords(result.title),
    ]),
  ]);

  return keywords.slice(0, 8);
}

export function detectStaleBuzzwords(results: SearchResult[]) {
  const haystack = results
    .map((result) => `${result.title} ${result.snippet}`)
    .join("\n");

  return STALE_BUZZWORDS.filter((word) => haystack.includes(word));
}

export function inferCrowdedness(
  results: SearchResult[],
  staleBuzzwords: string[]
): "low" | "medium" | "high" {
  const repeatedTitles = new Set(
    results.map((result) => result.title.replace(/\s+/g, " ").slice(0, 18))
  ).size;

  if (staleBuzzwords.length >= 2 || results.length - repeatedTitles >= 2) {
    return "high";
  }

  if (results.length >= 4 || staleBuzzwords.length === 1) {
    return "medium";
  }

  return "low";
}

export function buildSearchNotes(
  crowdedness: "low" | "medium" | "high",
  staleBuzzwords: string[]
) {
  const notes: string[] = [];

  if (crowdedness === "high") {
    notes.push("该话题近期讨论过密，请保留意思，但必须换一种更新、更具体、更少见的大白话表达。");
  }

  if (staleBuzzwords.length > 0) {
    notes.push(
      `注意这些词已经容易让用户审美疲劳：${staleBuzzwords.join("、")}。请执行“意思不变，换一种用户没见过的新说法”。`
    );
  }

  return notes;
}

export function buildSearchReferenceBundle(
  query: string,
  intent: SearchReferenceBundle["intent"],
  results: SearchResult[],
  freshness: SearchReferenceBundle["freshness"]
): SearchReferenceBundle {
  const normalizedResults = normalizeSearchResults(results);
  const staleBuzzwords = detectStaleBuzzwords(normalizedResults);
  const crowdedness = inferCrowdedness(normalizedResults, staleBuzzwords);
  const seoKeywords = extractSeoKeywords(query, normalizedResults);

  return {
    status: "success",
    query,
    intent,
    freshness,
    results: normalizedResults,
    seoKeywords,
    crowdedness,
    staleBuzzwords,
    notes: buildSearchNotes(crowdedness, staleBuzzwords),
  };
}
