import { z } from "zod";

export type TopicSearchPlan = {
  coreTopic: string;
  historyKeyword: string;
  realtimeKeyword: string;
  requiredTerms: string[];
  relatedTerms: string[];
  excludedTerms: string[];
};

const planTermSchema = z.string().trim().min(1).max(60);

export const topicSearchPlanSchema = z.object({
  coreTopic: z.string().trim().min(1).max(120),
  historyKeyword: z.string().trim().min(1).max(60),
  realtimeKeyword: z.string().trim().min(1).max(120),
  requiredTerms: z.array(planTermSchema).min(1).max(8),
  relatedTerms: z.array(planTermSchema).max(10),
  excludedTerms: z.array(planTermSchema).max(5),
});

const BUSINESS_INSTRUCTIONS = [
  "我想写一篇",
  "我想写",
  "公众号爆款选题",
  "公众号选题",
  "爆款选题",
  "公众号",
  "选题",
  "最新",
  "摘要",
  "大纲",
];

function normalizeText(input: string) {
  return input
    .replace(/[“”"'【】\[\]\n\r\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripBusinessInstructions(input: string) {
  return BUSINESS_INSTRUCTIONS.reduce(
    (text, instruction) => text.replaceAll(instruction, " "),
    input
  )
    .replace(/\s+/g, " ")
    .trim();
}

function unique(items: string[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const normalized = item.toLocaleLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function extractProtectedEntities(input: string) {
  const versioned =
    input.match(/\b[A-Za-z][A-Za-z0-9]*(?:[.-][A-Za-z0-9]+)+(?:\s+[A-Za-z0-9]+){0,2}\b/g) ?? [];
  const namedVersions =
    input.match(/\b[A-Za-z][A-Za-z0-9]*(?:\s+(?:\d+(?:\.\d+)?|Pro|Max|Mini|Ultra|Plus)){1,3}\b/gi) ?? [];

  return unique([...versioned, ...namedVersions].map((term) => term.trim()));
}

function extractFallbackTerms(input: string) {
  const protectedEntities = extractProtectedEntities(input);
  const chunks =
    input.match(/[\u4e00-\u9fff]{2,12}|[A-Za-z][A-Za-z0-9.-]{1,30}/g) ?? [];

  return unique([...protectedEntities, ...chunks]).filter(
    (term) => !BUSINESS_INSTRUCTIONS.includes(term)
  );
}

function truncate(input: string, maxLength: number) {
  return input.length <= maxLength ? input : input.slice(0, maxLength).trim();
}

export function buildFallbackTopicSearchPlan(idea: string): TopicSearchPlan {
  const normalized = normalizeText(idea);
  const cleaned = stripBusinessInstructions(normalized) || normalized;
  const directEntity = cleaned.length <= 40 && !/[，。！？!?；;]/.test(cleaned);
  const terms = extractFallbackTerms(cleaned);
  const protectedEntities = extractProtectedEntities(cleaned);
  const requiredTerms = directEntity
    ? [cleaned]
    : protectedEntities.length > 0
      ? protectedEntities.slice(0, 4)
      : terms.slice(0, 2);
  const safeRequiredTerms = requiredTerms.length > 0 ? requiredTerms : [truncate(cleaned, 60)];
  const queryTerms = unique([...safeRequiredTerms, ...terms]).slice(0, 6);
  const realtimeKeyword = directEntity
    ? cleaned
    : truncate(queryTerms.join(" ") || cleaned, 120);
  const historyKeyword = directEntity
    ? cleaned
    : truncate(queryTerms.slice(0, 3).join(" ") || cleaned, 60);

  return topicSearchPlanSchema.parse({
    coreTopic: truncate(normalized, 120),
    historyKeyword,
    realtimeKeyword,
    requiredTerms: safeRequiredTerms,
    relatedTerms: terms
      .filter((term) => !safeRequiredTerms.includes(term))
      .slice(0, 8),
    excludedTerms: [],
  });
}
