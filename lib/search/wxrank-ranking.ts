import type { TopicSearchPlan } from "./topic-search-plan";

const WXRANK_STOP_WORDS = new Set([
  "痛点",
  "现状",
  "结构",
  "大纲",
  "人群",
  "最新",
  "爆款",
  "摘要",
  "选题",
]);

const GENERIC_ENTITY_TERMS = new Set([
  "普通人",
  "人群",
  "用户",
  "新手",
  "小白",
  "大众",
  "年轻人",
  "上班族",
  "宝妈",
  "创业者",
]);

const WECHAT_IDENTITY_PARAMS = ["__biz", "mid", "idx", "sn"];

const ROLLING_WINDOW_MS = 30 * 24 * 60 * 60 * 1_000;

export type WxrankQueryTerms = {
  historyKeyword: string;
  realtimeKeyword: string;
  scoringTerms: string[];
};

export type WxrankHistoricalArticle = {
  title: string;
  content: string;
  pubTime: string;
  url: string;
  readCount: number;
  likeCount: number;
  lookingCount: number;
  shareCount: number;
};

type RankedArticle = {
  article: WxrankHistoricalArticle;
  relevanceScore: number;
  engagementScore: number;
  publishedAt: number;
};

function normalizeSearchText(input: string) {
  return input
    .replace(/[，。、“”"'！？!?,.:;：；（）()【】\[\]\n\r\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTrailingStopWords(chunk: string) {
  let result = chunk;
  let stripped = true;

  while (stripped && result) {
    stripped = false;

    for (const stopWord of WXRANK_STOP_WORDS) {
      if (result !== stopWord && result.endsWith(stopWord)) {
        result = result.slice(0, -stopWord.length);
        stripped = true;
        break;
      }
    }
  }

  return result;
}

function segmentChunk(chunk: string) {
  if (/^[\u4e00-\u9fff]+$/.test(chunk)) {
    return [chunk];
  }

  const segmenter = new Intl.Segmenter("zh-CN", { granularity: "word" });

  return Array.from(segmenter.segment(chunk))
    .filter((part) => part.isWordLike)
    .map((part) => part.segment);
}

function uniqueTerms(terms: string[]) {
  const seen = new Set<string>();

  return terms.filter((term) => {
    const key = term.toLocaleLowerCase();
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function selectEntityTerm(terms: string[]) {
  const asciiEntity = terms.find((term) => /[A-Za-z]/.test(term));
  if (asciiEntity) {
    return asciiEntity;
  }

  return terms.find((term) => !GENERIC_ENTITY_TERMS.has(term)) ?? terms[0] ?? "";
}

export function buildWxrankQueryTerms(query: string): WxrankQueryTerms {
  const chunks = normalizeSearchText(query)
    .split(" ")
    .filter(Boolean)
    .filter((chunk) => !WXRANK_STOP_WORDS.has(chunk))
    .map(stripTrailingStopWords)
    .filter(Boolean);
  const retainedChunks: string[] = [];
  const scoringTerms: string[] = [];

  for (const chunk of chunks) {
    const retainedTerms = segmentChunk(chunk).filter((term) => !WXRANK_STOP_WORDS.has(term));
    if (retainedTerms.length === 0) {
      continue;
    }

    retainedChunks.push(retainedTerms.join(""));
    scoringTerms.push(...retainedTerms);
  }

  const uniqueScoringTerms = uniqueTerms(scoringTerms);

  return {
    historyKeyword: selectEntityTerm(uniqueScoringTerms),
    realtimeKeyword: retainedChunks.join(" "),
    scoringTerms: uniqueScoringTerms,
  };
}

function parseWxrankTimestamp(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(\.\d{1,3})?(Z|[+-]\d{2}:?\d{2})?$/i
  );
  if (!match) {
    return Number.NaN;
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, fraction, zone] =
    match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth[month - 1] ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return Number.NaN;
  }

  if (zone && zone.toUpperCase() !== "Z") {
    const zoneParts = zone.slice(1).split(":");
    const zoneHour = Number(zoneParts[0]?.slice(0, 2));
    const zoneMinute = Number(zone.includes(":") ? zoneParts[1] : zone.slice(-2));
    if (zoneHour > 23 || zoneMinute > 59) {
      return Number.NaN;
    }
  }

  const timezone = zone ?? "+08:00";
  return Date.parse(
    `${yearText}-${monthText}-${dayText}T${hourText}:${minuteText}:${secondText}${fraction ?? ""}${timezone}`
  );
}

function normalizeWechatUrl(value: string) {
  try {
    const url = new URL(value);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.hostname.toLocaleLowerCase() !== "mp.weixin.qq.com"
    ) {
      return "";
    }

    url.protocol = "https:";
    url.hostname = "mp.weixin.qq.com";
    url.hash = "";

    if (url.pathname === "/s") {
      const identityParams = new URLSearchParams();
      for (const param of WECHAT_IDENTITY_PARAMS) {
        const paramValue = url.searchParams.get(param);
        if (!paramValue) {
          return "";
        }

        identityParams.set(param, paramValue);
      }
      url.search = identityParams.toString();
    } else if (/^\/s\/[^/]+$/.test(url.pathname)) {
      url.search = "";
    } else {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function termMatches(text: string, term: string) {
  if (/^[A-Za-z]+$/.test(term)) {
    return new RegExp(`(^|[^A-Za-z])${escapeRegExp(term)}(?=[^A-Za-z]|$)`, "i").test(text);
  }

  return text.toLocaleLowerCase().includes(term.toLocaleLowerCase());
}

function countTermMatches(text: string, terms: string[]) {
  return terms.filter((term) => termMatches(text, term)).length;
}

function isPreciseEntity(term: string) {
  return /[0-9.\-]/.test(term) || /\s/.test(term);
}

function normalizedPlanTerms(terms: string[]) {
  return uniqueTerms(terms.map((term) => term.trim()).filter(Boolean));
}

export function isRelevantToTopicPlan(
  title: string,
  content: string,
  plan: TopicSearchPlan
) {
  const requiredTerms = normalizedPlanTerms(plan.requiredTerms);
  if (requiredTerms.length === 0) return false;

  const preciseTerms = requiredTerms.filter(isPreciseEntity);
  const broadTerms = requiredTerms.filter((term) => !isPreciseEntity(term));
  const relatedTerms = normalizedPlanTerms(plan.relatedTerms);
  const excludedTerms = normalizedPlanTerms(plan.excludedTerms);
  const searchableText = `${title}\n${content}`;
  const preciseTitleMatch = preciseTerms.some((term) => termMatches(title, term));
  const preciseMatch = preciseTerms.some((term) => termMatches(searchableText, term));
  const broadTitleMatch = broadTerms.some((term) => termMatches(title, term));
  const broadMatch = broadTerms.some((term) => termMatches(searchableText, term));
  const excludedTitleMatch = excludedTerms.some((term) => termMatches(title, term));

  if (excludedTitleMatch && !preciseTitleMatch) {
    return false;
  }

  if (preciseMatch) {
    return true;
  }

  if (!broadMatch) {
    return false;
  }

  if (relatedTerms.length === 0) {
    return broadTitleMatch;
  }

  return relatedTerms.some((term) => termMatches(searchableText, term));
}

function engagementScore(article: WxrankHistoricalArticle) {
  return (
    Math.max(0, article.readCount) +
    Math.max(0, article.likeCount) * 20 +
    Math.max(0, article.lookingCount) * 30 +
    Math.max(0, article.shareCount) * 25
  );
}

export function filterAndRankHistoricalArticles(
  articles: WxrankHistoricalArticle[],
  scoringTermsOrPlan: string[] | TopicSearchPlan,
  now: Date
): WxrankHistoricalArticle[] {
  const plan = Array.isArray(scoringTermsOrPlan) ? undefined : scoringTermsOrPlan;
  const terms = normalizedPlanTerms(
    plan
      ? [...plan.requiredTerms, ...plan.relatedTerms]
      : scoringTermsOrPlan
  );
  if (terms.length === 0 || !Number.isFinite(now.getTime())) {
    return [];
  }

  const oldestAllowed = now.getTime() - ROLLING_WINDOW_MS;
  const entityTerm = selectEntityTerm(terms);
  const ranked: RankedArticle[] = [];

  for (const article of articles) {
    const title = article.title.trim();
    const normalizedUrl = normalizeWechatUrl(article.url);
    const publishedAt = parseWxrankTimestamp(article.pubTime);

    if (
      !title ||
      !normalizedUrl ||
      !Number.isFinite(publishedAt) ||
      publishedAt < oldestAllowed ||
      publishedAt > now.getTime()
    ) {
      continue;
    }

    const searchableText = `${title}\n${article.content}`;
    if (
      plan
        ? !isRelevantToTopicPlan(title, article.content, plan)
        : !termMatches(searchableText, entityTerm)
    ) {
      continue;
    }

    const titleMatches = countTermMatches(title, terms);
    const contentOnlyTerms = terms.filter((term) => !termMatches(title, term));
    const contentMatches = countTermMatches(article.content, contentOnlyTerms);

    ranked.push({
      article: { ...article, url: normalizedUrl },
      relevanceScore: titleMatches * 3 + contentMatches,
      engagementScore: engagementScore(article),
      publishedAt,
    });
  }

  ranked.sort(
    (left, right) =>
      right.relevanceScore - left.relevanceScore ||
      right.engagementScore - left.engagementScore ||
      right.publishedAt - left.publishedAt
  );

  const seenUrls = new Set<string>();

  return ranked.flatMap(({ article }) => {
    const normalizedUrl = normalizeWechatUrl(article.url);
    if (seenUrls.has(normalizedUrl)) {
      return [];
    }

    seenUrls.add(normalizedUrl);
    return [article];
  });
}
