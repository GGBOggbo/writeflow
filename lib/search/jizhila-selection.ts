import type { SearchEngagementMetrics, SearchResult } from "./types";

const PAIN_TERMS = [
  "焦虑",
  "不会",
  "没人",
  "失败",
  "踩坑",
  "后悔",
  "真相",
  "为什么",
  "怎么办",
  "太难",
  "放弃",
  "卡住",
];

const PERSONAL_TERMS = [
  "我",
  "我的",
  "亲历",
  "复盘",
  "实录",
  "普通人",
  "一个人",
  "第一次",
  "做了",
];

const SCENE_TERMS = [
  "宝妈",
  "副业",
  "新手",
  "公众号",
  "AI写作",
  "AI",
  "长沙",
  "奶茶店",
  "职场",
  "35岁",
  "n8n",
  "Claude",
  "ChatGPT",
  "智能体",
  "工作流",
];

const TREND_OPPORTUNITY_TERMS = [
  "重磅更新",
  "红利",
  "新机会",
  "史诗级",
  "来了",
  "更新",
];

const OFFICIAL_TERMS = [
  "人民日报",
  "央视",
  "新华社",
  "官方",
  "协会",
  "研究院",
  "公报",
  "白皮书",
  "发布",
  "报告",
];

const BROAD_NARRATIVE_TERMS = ["行业趋势", "全景", "年度观察", "宏观"];

function textOf(result: SearchResult) {
  return `${result.title} ${result.snippet} ${(result.notes ?? []).join(" ")}`;
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function countMatches(text: string, terms: string[]) {
  return terms.filter((term) => text.includes(term)).length;
}

function hasOfficialSource(result: SearchResult) {
  return includesAny(textOf(result), OFFICIAL_TERMS);
}

function hasConcreteTrendOpportunity(result: SearchResult) {
  const text = textOf(result);
  return includesAny(text, TREND_OPPORTUNITY_TERMS) && includesAny(text, SCENE_TERMS);
}

function safeRate(value: number | undefined, readCount: number | undefined) {
  if (!value || !readCount || readCount <= 0) return 0;
  return value / readCount;
}

function engagementRateScore(metrics?: SearchEngagementMetrics) {
  if (!metrics?.readCount) return 0;

  const likeRate = safeRate(metrics.likeCount, metrics.readCount);
  const lookingRate = safeRate(metrics.lookingCount, metrics.readCount);
  const collectRate = safeRate(metrics.collectCount, metrics.readCount);
  const commentRate = safeRate(metrics.commentCount, metrics.readCount);

  return likeRate * 18 + lookingRate * 22 + collectRate * 28 + commentRate * 42;
}

function readSweetSpotScore(readCount?: number) {
  if (!readCount) return 0;
  if (readCount >= 2_000 && readCount <= 30_000) return 10;
  if (readCount >= 1_000 && readCount < 2_000) return 6;
  if (readCount > 30_000 && readCount < 100_001) return 4;
  return 0;
}

function bigAccountPenalty(metrics?: SearchEngagementMetrics) {
  if (!metrics?.readCount || metrics.readCount < 100_000) return 0;

  const rates = engagementRateScore(metrics);
  return rates < 1.2 ? 18 : 8;
}

function candidateProfile(result: SearchResult) {
  const text = textOf(result);
  const pain = countMatches(text, PAIN_TERMS);
  const personal = countMatches(text, PERSONAL_TERMS);
  const scene = countMatches(text, SCENE_TERMS);
  const concreteTrend = hasConcreteTrendOpportunity(result);
  const official = hasOfficialSource(result);
  const broad = includesAny(text, BROAD_NARRATIVE_TERMS);
  const titleParty = includesAny(text, ["颠覆认知", "财富密码", "闭眼入", "必看"]);

  const reasons: string[] = [];
  if (pain > 0) reasons.push("痛点表达强");
  if (personal > 0) reasons.push("个人视角");
  if (scene > 0) reasons.push("细分场景");
  if (concreteTrend) reasons.push("具体趋势机会");
  if (official) reasons.push("疑似官方/机构号");
  if (broad) reasons.push("宏大叙事");

  return {
    pain,
    personal,
    scene,
    concreteTrend,
    official,
    broad,
    titleParty,
    reasons,
  };
}

function scoreEngagementCandidate(result: SearchResult) {
  const profile = candidateProfile(result);

  return (
    profile.pain * 8 +
    profile.personal * 7 +
    profile.scene * 5 +
    (profile.concreteTrend ? 12 : 0) -
    (profile.official ? 22 : 0) -
    (profile.broad && !profile.concreteTrend ? 8 : 0) -
    (profile.titleParty ? 8 : 0)
  );
}

function annotateCandidate(result: SearchResult) {
  const profile = candidateProfile(result);
  const candidateScore = scoreEngagementCandidate(result);

  return {
    ...result,
    qualitySignals: {
      ...result.qualitySignals,
      candidateScore,
      reasons: profile.reasons,
    },
  };
}

function scoreStable(result: SearchResult) {
  const profile = candidateProfile(result);
  const metrics = result.engagementMetrics;
  const readCount = metrics?.readCount ?? 0;
  const volumeConfidence = readCount >= 8_000 && readCount <= 30_000 ? 18 : 0;

  return (
    engagementRateScore(metrics) * 30 +
    readSweetSpotScore(metrics?.readCount) +
    Math.log10(readCount + 1) * 40 +
    volumeConfidence +
    profile.pain * 2 +
    profile.personal * 2 +
    profile.scene -
    (profile.official ? 18 : 0) -
    bigAccountPenalty(metrics)
  );
}

function scoreAnomaly(result: SearchResult) {
  const profile = candidateProfile(result);
  const metrics = result.engagementMetrics;

  return (
    engagementRateScore(metrics) * 130 +
    readSweetSpotScore(metrics?.readCount) * 1.4 +
    profile.pain * 3 +
    profile.personal * 4 +
    profile.scene * 1.5 +
    (hasConcreteTrendOpportunity(result) ? 5 : 0) -
    (profile.official ? 25 : 0) -
    bigAccountPenalty(metrics)
  );
}

function annotateDeepDive(result: SearchResult) {
  return {
    ...result,
    qualitySignals: {
      ...result.qualitySignals,
      stableScore: scoreStable(result),
      anomalyScore: scoreAnomaly(result),
      reasons: candidateProfile(result).reasons,
    },
  };
}

export function selectEngagementCandidates(results: SearchResult[], limit = 5) {
  return results
    .map((result, index) => ({ result: annotateCandidate(result), index }))
    .sort((left, right) => {
      const diff =
        (right.result.qualitySignals?.candidateScore ?? 0) -
        (left.result.qualitySignals?.candidateScore ?? 0);
      return diff === 0 ? left.index - right.index : diff;
    })
    .slice(0, limit)
    .map((item) => item.result);
}

export function selectDeepDiveArticles(results: SearchResult[], limit = 4) {
  if (limit <= 0) return [];

  const annotated = results.map((result, index) => ({
    result: annotateDeepDive(result),
    index,
  }));
  const stable = [...annotated].sort((left, right) => {
    const diff =
      (right.result.qualitySignals?.stableScore ?? 0) -
      (left.result.qualitySignals?.stableScore ?? 0);
    return diff === 0 ? left.index - right.index : diff;
  })[0];

  if (!stable || limit === 1) {
    return stable ? [stable.result] : [];
  }

  const anomaly = annotated
    .filter((item) => item.result.url !== stable.result.url)
    .sort((left, right) => {
      const diff =
        (right.result.qualitySignals?.anomalyScore ?? 0) -
        (left.result.qualitySignals?.anomalyScore ?? 0);
      return diff === 0 ? left.index - right.index : diff;
    })[0];

  const selected = [stable.result, ...(anomaly ? [anomaly.result] : [])];
  if (selected.length >= limit) {
    return selected.slice(0, limit);
  }

  const selectedUrls = new Set(selected.map((result) => result.url));
  const remaining = annotated
    .filter((item) => !selectedUrls.has(item.result.url))
    .sort((left, right) => {
      const leftScore =
        (left.result.qualitySignals?.stableScore ?? 0) +
        (left.result.qualitySignals?.anomalyScore ?? 0);
      const rightScore =
        (right.result.qualitySignals?.stableScore ?? 0) +
        (right.result.qualitySignals?.anomalyScore ?? 0);
      return rightScore === leftScore ? left.index - right.index : rightScore - leftScore;
    })
    .map((item) => item.result);

  return [...selected, ...remaining].slice(0, limit);
}
