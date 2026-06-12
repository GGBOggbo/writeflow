# Topic Debug Tracing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add structured, safe debug logs that explain the complete topic-generation path from search planning through wxrank filtering, retained ranking, deep-dive enrichment, prompt context, and total timing.

**Architecture:** Extend wxrank relevance evaluation with diagnostic data so filtering and logging use one source of truth. Keep provider-level logging responsible for retrieval, ranking, and enrichment, while `generateTopics` owns stage timing and final reference-context statistics. All logged text passes through bounded single-line sanitizers and no article body, comment text, URL, or secret is logged.

**Tech Stack:** TypeScript, Vitest, existing `lib/debug.ts` logger, wxrank search provider, AI service.

---

### Task 1: Relevance diagnostics

**Files:**
- Modify: `lib/search/wxrank-ranking.ts`
- Modify: `lib/search/wxrank-ranking.test.ts`

- [ ] **Step 1: Write failing tests for relevance explanations**

Add tests that call a new exported `evaluateTopicPlanRelevance(title, content, plan)` and assert:

```ts
expect(evaluateTopicPlanRelevance(
  "GPT-5.6 如何改变普通职场人",
  "岗位转型建议",
  plan
)).toMatchObject({
  retained: true,
  matchedTerms: ["GPT-5.6"],
  reasons: ["命中精确核心词"],
});

expect(evaluateTopicPlanRelevance(
  "军事观察",
  "正文提到 GPT",
  plan
)).toMatchObject({
  retained: false,
  rejectionReason: "命中排除方向",
});
```

- [ ] **Step 2: Run the ranking tests and verify failure**

Run: `npm test -- lib/search/wxrank-ranking.test.ts`

Expected: FAIL because `evaluateTopicPlanRelevance` is not exported.

- [ ] **Step 3: Implement one-source relevance diagnostics**

Add:

```ts
export type TopicPlanRelevanceEvaluation = {
  retained: boolean;
  matchedTerms: string[];
  score: number;
  reasons: string[];
  rejectionReason?: string;
};

export function evaluateTopicPlanRelevance(
  title: string,
  content: string,
  plan: TopicSearchPlan
): TopicPlanRelevanceEvaluation;
```

Use the existing exact/broad/related/excluded checks. Return bounded Chinese reason labels, calculate a deterministic relevance score from title and content matches, and make `isRelevantToTopicPlan` return `.retained` from this function.

- [ ] **Step 4: Run the ranking tests**

Run: `npm test -- lib/search/wxrank-ranking.test.ts`

Expected: PASS.

### Task 2: wxrank retrieval, retained-result, and deep-dive logs

**Files:**
- Modify: `lib/search/wxrank-provider.ts`
- Modify: `lib/search/wxrank-provider.test.ts`

- [ ] **Step 1: Write failing provider logging tests**

Extend the existing realtime filtering test to assert the completed log contains `retained`, `rejected`, `elapsedMs`, and a rejection-reason summary, then assert one `retained result` debug entry contains only rank, origin, bounded title, matched terms, score, and reasons. Extend deep-dive tests to assert `artinfo completed`, `getcm completed`, `getcm skipped`, and safe warning logs on failures.

- [ ] **Step 2: Run provider tests and verify failure**

Run: `npm test -- lib/search/wxrank-provider.test.ts`

Expected: FAIL because the new structured log fields are absent.

- [ ] **Step 3: Add safe logging helpers and route metadata**

Add internal helpers equivalent to:

```ts
function logText(value: string, limit = 120) {
  return cleanText(value).replace(/[\n\r\t]+/g, " ").slice(0, limit);
}

type RoutedResult = {
  result: SearchResult;
  origin: "history" | "realtime";
  matchedTerms: string[];
  score: number;
  reasons: string[];
};
```

Keep route metadata local to the provider and strip it before returning `SearchResult[]`. Record per-call elapsed milliseconds around `artlist`, `getso`, `artinfo`, and `getcm`.

- [ ] **Step 4: Log filter summaries and final retained results**

For realtime results, evaluate every item once, aggregate rejected reason counts, retain passing items, and log:

```ts
log.info("wxrank", "getso completed", {
  raw,
  retained,
  rejected,
  elapsedMs,
  rejectedReasons,
});
```

After merge/dedupe, emit at most eight `log.debug("wxrank", "retained result", ...)` records. Do not include URL, snippet, body, or rejected titles.

- [ ] **Step 5: Log deep-dive decisions and outcomes**

Before enrichment, log selected titles and existing quality-signal reasons/scores. Log `artinfo` and `getcm` start/completion timings, explicitly log `getcm skipped` when no comment ID exists, and warn with only the error name/message when an individual enrichment call fails.

- [ ] **Step 6: Run provider tests**

Run: `npm test -- lib/search/wxrank-provider.test.ts`

Expected: PASS, including assertions that article HTML, comment content, and test API keys do not appear in logs.

### Task 3: Topic-stage timing and reference-context logs

**Files:**
- Modify: `lib/ai/service.ts`
- Modify: `lib/ai/service.test.ts`

- [ ] **Step 1: Write failing AI service logging tests**

Add one success test at `LOG_LEVEL=debug` and assert logs contain `start`, `search plan`, `reference context`, and `completed`. Verify planning source, stage durations, search-result composition, prompt reference count capped at four, HTML/comment counts, and topic count. Add a planner-failure assertion for a safe `source: "fallback"` warning.

- [ ] **Step 2: Run AI service tests and verify failure**

Run: `npm test -- lib/ai/service.test.ts`

Expected: FAIL because topic-stage tracing is absent.

- [ ] **Step 3: Implement topic-stage tracing**

Import the existing logger and add bounded preview/stat helpers. In `generateTopics`, capture timestamps around planning, search, and generation; record whether planning used AI or fallback; detect numeric year tokens in planned keywords that did not occur in the user input; and log final context statistics:

```ts
{
  searchResults,
  history,
  realtime,
  promptReferences: Math.min(results.length, 4),
  withHtml,
  withComments,
  contextChars,
}
```

`contextChars` is computed from the same first four formatted references used by the prompt builder. Do not log those formatted references themselves.

- [ ] **Step 4: Run AI service tests**

Run: `npm test -- lib/ai/service.test.ts`

Expected: PASS.

### Task 4: Full verification and commit

**Files:**
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`

- [ ] **Step 1: Run focused lint**

Run: `npx eslint lib/search/wxrank-ranking.ts lib/search/wxrank-ranking.test.ts lib/search/wxrank-provider.ts lib/search/wxrank-provider.test.ts lib/ai/service.ts lib/ai/service.test.ts`

Expected: zero errors.

- [ ] **Step 2: Run the full test suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: build succeeds.

- [ ] **Step 4: Check the diff for secret or body leakage**

Run: `git diff --check && git diff -- lib/search/wxrank-ranking.ts lib/search/wxrank-provider.ts lib/ai/service.ts | rg -n "API_KEY|Authorization|articleHtml|comments"`

Expected: no hard-coded secret; any `articleHtml` or `comments` occurrences are counts/booleans, not logged content.

- [ ] **Step 5: Update planning records and commit only feature files**

Record verification results in the three planning files, stage only the topic tracing implementation/tests/docs, and commit with:

```bash
git commit -m "feat: trace topic search decisions"
```

