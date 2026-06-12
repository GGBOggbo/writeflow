# AI Topic Search Planning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI-generated topic search plan before every topic search, preserve exact entities such as `GPT-5.6`, and reject off-topic wxrank results without adding another credit charge.

**Architecture:** Add a focused `TopicSearchPlan` contract and deterministic fallback planner under `lib/search/`. Extend the existing AI provider with one low-token structured call, then pass the plan through the search service into wxrank. wxrank keeps the historical-first routing but applies one shared relevance gate to both historical and realtime results.

**Tech Stack:** TypeScript, Zod, Vitest, existing OpenAI-compatible DeepSeek/MiMo client, wxrank provider, Next.js route metering.

---

### Task 1: Search plan contract and safe fallback

**Files:**
- Create: `lib/search/topic-search-plan.ts`
- Create: `lib/search/topic-search-plan.test.ts`
- Modify: `lib/search/types.ts`

- [ ] **Step 1: Write failing tests for exact entity preservation and fallback plans**

Test that `buildFallbackTopicSearchPlan("GPT-5.6")` preserves `GPT-5.6` in `coreTopic`, `historyKeyword`, `realtimeKeyword`, and `requiredTerms`. Add cases for `Claude 5`, `iPhone 18 Pro`, Chinese names, and a long paragraph.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test -- lib/search/topic-search-plan.test.ts`

Expected: FAIL because `topic-search-plan.ts` does not exist.

- [ ] **Step 3: Implement the contract, Zod schema, normalization, and fallback**

Create:

```ts
export type TopicSearchPlan = {
  coreTopic: string;
  historyKeyword: string;
  realtimeKeyword: string;
  requiredTerms: string[];
  relatedTerms: string[];
  excludedTerms: string[];
};

export const topicSearchPlanSchema = z.object({
  coreTopic: z.string().trim().min(1).max(120),
  historyKeyword: z.string().trim().min(1).max(60),
  realtimeKeyword: z.string().trim().min(1).max(120),
  requiredTerms: z.array(z.string().trim().min(1)).min(1).max(8),
  relatedTerms: z.array(z.string().trim().min(1)).max(10),
  excludedTerms: z.array(z.string().trim().min(1)).max(5),
});
```

The fallback must retain letters, digits, dots, hyphens, Chinese text, and spaces. It may remove known business instructions but must not split versioned entities.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run: `npm test -- lib/search/topic-search-plan.test.ts`

Expected: all fallback planner tests pass.

- [ ] **Step 5: Commit the contract**

```bash
git add lib/search/topic-search-plan.ts lib/search/topic-search-plan.test.ts lib/search/types.ts
git commit -m "feat: add topic search plan contract"
```

### Task 2: AI provider search planning capability

**Files:**
- Create: `lib/ai/prompts/topic-search-plan.ts`
- Create: `lib/ai/prompts/topic-search-plan.test.ts`
- Modify: `lib/ai/provider.ts`
- Modify: `lib/ai/mock-provider.ts`
- Modify: `lib/ai/real-provider.ts`

- [ ] **Step 1: Write failing prompt and provider tests**

Verify the prompt explicitly requires preservation of `GPT-5.6`, limits `excludedTerms` to high-confidence conflicts, and asks for only the fixed JSON structure. Verify the mock provider returns a valid plan.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm test -- lib/ai/prompts/topic-search-plan.test.ts`

Expected: FAIL because the prompt module and provider method do not exist.

- [ ] **Step 3: Add `planTopicSearch` to `AIProvider`**

Use this signature:

```ts
planTopicSearch(idea: string): Promise<TopicSearchPlan>;
```

Implement it in mock and real providers. The real provider must reuse `callMimo` with `maxTokens: 500`, low temperature, disabled thinking, `topicSearchPlanSchema`, and no extra HTTP route.

- [ ] **Step 4: Run AI-focused tests and confirm GREEN**

Run: `npm test -- lib/ai/prompts/topic-search-plan.test.ts lib/ai/service.test.ts`

Expected: prompt tests and existing service tests pass.

- [ ] **Step 5: Commit provider support**

```bash
git add lib/ai/prompts/topic-search-plan.ts lib/ai/prompts/topic-search-plan.test.ts lib/ai/provider.ts lib/ai/mock-provider.ts lib/ai/real-provider.ts
git commit -m "feat: add AI topic search planner"
```

### Task 3: Coordinate planning and search inside topic generation

**Files:**
- Modify: `lib/ai/service.ts`
- Modify: `lib/ai/service.test.ts`
- Modify: `lib/search/service.ts`
- Modify: `lib/search/types.ts`
- Modify: `lib/progress/types.ts`
- Modify: `components/generation-pulse.tsx`
- Modify: `components/generation-pulse.test.tsx`

- [ ] **Step 1: Write failing service tests**

Test that every search-enabled topic generation calls `planTopicSearch` before search, passes the plan to the search service, emits real `topic_search_planning_started/completed` events, and falls back to `buildFallbackTopicSearchPlan` when AI planning throws. Confirm topic generation still succeeds after planner failure.

- [ ] **Step 2: Run service tests and confirm RED**

Run: `npm test -- lib/ai/service.test.ts components/generation-pulse.test.tsx`

Expected: FAIL because planning is not yet coordinated or displayed.

- [ ] **Step 3: Implement orchestration and progress events**

Within `generateTopics`, obtain the provider once, emit `理解创作意图`, call `provider.planTopicSearch`, validate the plan, and fall back safely on any error. Pass the plan into `searchForTopics`. Continue using the original `input.idea` for final topic generation.

Extend `SearchQueryInput` with:

```ts
topicPlan?: TopicSearchPlan;
```

Update the generation pulse so the new real events appear in the existing search phase rather than creating a fake timer.

- [ ] **Step 4: Run service/UI tests and confirm GREEN**

Run: `npm test -- lib/ai/service.test.ts components/generation-pulse.test.tsx`

Expected: all focused tests pass.

- [ ] **Step 5: Commit orchestration**

```bash
git add lib/ai/service.ts lib/ai/service.test.ts lib/search/service.ts lib/search/types.ts lib/progress/types.ts components/generation-pulse.tsx components/generation-pulse.test.tsx
git commit -m "feat: plan topic searches before retrieval"
```

### Task 4: wxrank relevance gate for historical and realtime results

**Files:**
- Modify: `lib/search/wxrank-ranking.ts`
- Modify: `lib/search/wxrank-ranking.test.ts`
- Modify: `lib/search/wxrank-provider.ts`
- Modify: `lib/search/wxrank-provider.test.ts`

- [ ] **Step 1: Write failing ranking tests**

Cover these cases:

```text
GPT-5.6 exact title match                      -> keep
Military title with GPT mentioned in content  -> reject
Broad GPT title plus related workplace term   -> keep
Excluded word only mentioned incidentally     -> keep
Realtime result failing the same gate          -> reject
```

Also assert that wxrank receives the AI plan's `historyKeyword` and `realtimeKeyword` unchanged.

- [ ] **Step 2: Run wxrank tests and confirm RED**

Run: `npm test -- lib/search/wxrank-ranking.test.ts lib/search/wxrank-provider.test.ts`

Expected: new relevance-gate tests fail against the existing scoring-term-only logic.

- [ ] **Step 3: Implement deterministic relevance filtering**

Add a shared gate that:

- normalizes without deleting dots or hyphens;
- admits exact required entity matches;
- requires a related/core-topic signal when only a broad alias matches;
- rejects excluded-topic titles when the precise entity is absent from the title;
- scores related terms for ordering;
- applies to both historical and realtime result arrays.

When a `topicPlan` exists, wxrank must use its keywords directly. Keep `buildWxrankQueryTerms` only as fallback for callers without a plan.

- [ ] **Step 4: Run wxrank tests and confirm GREEN**

Run: `npm test -- lib/search/wxrank-ranking.test.ts lib/search/wxrank-provider.test.ts`

Expected: all historical routing, realtime fallback, and new relevance tests pass.

- [ ] **Step 5: Commit the quality gate**

```bash
git add lib/search/wxrank-ranking.ts lib/search/wxrank-ranking.test.ts lib/search/wxrank-provider.ts lib/search/wxrank-provider.test.ts
git commit -m "feat: gate wxrank results by search intent"
```

### Task 5: Metering regression and full verification

**Files:**
- Modify if needed: `app/api/ai/ai-routes.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Add a regression assertion for one credit operation**

Use the existing topics stream route test to verify one request still calls `creditStore.reserve` once and `creditStore.consume` once, despite two AI provider calls inside the service. Do not add a second operation ID or API request.

- [ ] **Step 2: Run route tests**

Run: `npm test -- app/api/ai/ai-routes.test.ts`

Expected: topics request remains a single metered operation.

- [ ] **Step 3: Document the topic search flow**

Update `README.md` to state that topic generation performs one AI search-planning call within the existing one-credit operation, then uses wxrank historical-first retrieval and realtime fallback.

- [ ] **Step 4: Run complete verification**

Run:

```bash
npm test
npm run lint
npm run build
git diff --check
```

Expected: all tests pass, lint and build succeed, and no whitespace errors are reported.

- [ ] **Step 5: Commit verification/docs**

```bash
git add app/api/ai/ai-routes.test.ts README.md
git commit -m "test: verify topic planning stays single-charge"
```
