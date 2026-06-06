# Network Search Quality Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve search-input quality and search-failure transparency so network-enhanced generation uses fresher results, cleaner queries, and explicit degraded-mode feedback without changing the overall writing workflow.

**Architecture:** Keep the current `lib/search/* -> lib/ai/service.ts -> API route -> useWorkflow` pipeline, but strengthen the search layer in three places: add intent-specific freshness mapping, replace raw query concatenation with deterministic rule-based query shaping, and return explicit search status (`success` / `degraded` / `empty`) so the AI service and frontend can react consistently.

**Tech Stack:** Next.js App Router, React client state via `useWorkflow` + Context, TypeScript, Zod, Vitest.

---

## File Map

### Modified files

- `lib/search/types.ts`
  - Add freshness type and explicit search status to the search bundle contract.
- `lib/search/generic-provider.ts`
  - Accept freshness from callers and pass it to Bocha instead of hardcoding `noLimit`.
- `lib/search/service.ts`
  - Add rule-based query shaping, intent-specific freshness mapping, and explicit degraded/empty handling.
- `lib/search/service.test.ts`
  - Cover freshness mapping, query shaping, and status behavior.
- `lib/ai/service.ts`
  - Consume the richer search result object and inject search context only on true success.
- `lib/ai/service.test.ts`
  - Verify search status handling and degraded-path behavior.
- `types/ai.ts`
  - Extend generation outputs that need to surface search status back to the client.
- `lib/ai/schemas.ts`
  - Extend response schemas for stages that need status-aware search metadata.
- `lib/ai/client.ts`
  - Accept the expanded API response shape.
- `components/hooks/use-workflow.ts`
  - Convert degraded search status into a user-visible non-blocking message while keeping generation alive.
- `components/app-client.test.tsx`
  - Verify degraded-mode messaging at the workflow layer.

### Files intentionally not touched in this round

- `components/search-toggle.tsx`
- `components/stages/*`
- `lib/search/normalize.ts`
- `lib/storage/workflow-storage.ts`

Reason: this round is about search quality and transparency, not UI layout or persistence behavior.

---

### Task 1: Add Search Freshness and Status Contracts

**Files:**
- Modify: `lib/search/types.ts`
- Modify: `lib/search/service.test.ts`

- [ ] **Step 1: Write the failing tests**

Add tests in `lib/search/service.test.ts` for:
- `topics` returning a bundle with `status: "success"` when results exist
- `searchForTopics()` returning `status: "degraded"` when fetch throws
- `searchForMeta()` returning `status: "empty"` when fetch succeeds with zero rows

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/search/service.test.ts`
Expected: FAIL because `SearchReferenceBundle` has no `status` field and the service still returns `null`.

- [ ] **Step 3: Write minimal contract changes**

Update `lib/search/types.ts` to add:

```ts
export type SearchFreshness =
  | "noLimit"
  | "pastDay"
  | "pastWeek"
  | "pastMonth"
  | "past6Months";

export type SearchBundleStatus = "success" | "degraded" | "empty";
```

And update the bundle/input types to include:

```ts
status: SearchBundleStatus;
freshness: SearchFreshness;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/search/service.test.ts`
Expected: PASS for the new status-shape assertions after the service is updated in the next task.

---

### Task 2: Replace Hardcoded `noLimit` with Intent-Based Freshness

**Files:**
- Modify: `lib/search/generic-provider.ts`
- Modify: `lib/search/service.ts`
- Modify: `lib/search/service.test.ts`

- [ ] **Step 1: Write the failing tests**

Add tests asserting:
- `topics` maps to `past6Months`
- `brief` maps to `past6Months`
- `outline` maps to `past6Months`
- `meta` maps to `pastMonth`
- the provider receives the mapped freshness in its POST body

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/search/service.test.ts`
Expected: FAIL because the provider still always posts `freshness: "noLimit"`.

- [ ] **Step 3: Implement minimal freshness mapping**

In `lib/search/service.ts`, add a helper like:

```ts
function getFreshnessForIntent(intent: SearchIntent): SearchFreshness {
  if (intent === "meta") return "pastMonth";
  return "past6Months";
}
```

Pass that value into `genericSearchProvider.search(...)`.

In `lib/search/generic-provider.ts`, change:

```ts
async search({ query, freshness }: SearchQueryInput)
```

and send:

```ts
body: JSON.stringify({
  query,
  freshness,
  summary: true,
  count: 8,
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/search/service.test.ts`
Expected: PASS and the provider call should no longer contain `"noLimit"` for normal stage searches.

---

### Task 3: Add Rule-Based Query Shaping

**Files:**
- Modify: `lib/search/service.ts`
- Modify: `lib/search/service.test.ts`

- [ ] **Step 1: Write the failing tests**

Add tests asserting:
- `buildTopicsSearchQuery("如何把小红书做成可复用流程")` produces a shorter keyword-style query
- the generated query does not contain noisy suffix words like `公众号` or `最新`
- `buildMetaSearchQuery(...)` keeps title/packaging intent words but trims overlong draft excerpts

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/search/service.test.ts`
Expected: FAIL because current query builders still return raw long-form concatenations.

- [ ] **Step 3: Implement minimal rule shaping**

In `lib/search/service.ts`, add small pure helpers:

```ts
function normalizeSearchText(input: string): string
function extractCoreTerms(input: string): string[]
function compactTerms(terms: string[], maxTerms = 4): string[]
```

Guidelines:
- trim whitespace
- split on punctuation and spaces
- remove empty tokens and short noise tokens
- remove explicit noise words such as `公众号`, `选题`, `最新`, `爆款`
- keep the strongest 2-4 semantic fragments

Then rewrite builders to return compact keyword-style strings, for example:

```ts
return [...compactTerms(extractCoreTerms(idea)), "痛点"].join(" ");
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/search/service.test.ts`
Expected: PASS with visibly shorter, cleaner query output.

---

### Task 4: Return Explicit `success / degraded / empty` Results from Search Service

**Files:**
- Modify: `lib/search/service.ts`
- Modify: `lib/search/service.test.ts`

- [ ] **Step 1: Write the failing tests**

Expand tests to assert:
- success path returns a non-empty bundle with `status: "success"`
- empty-success path returns `status: "empty"` and `results: []`
- exception path returns `status: "degraded"` and `results: []`

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/search/service.test.ts`
Expected: FAIL because the service still returns `null` instead of typed statuses.

- [ ] **Step 3: Implement minimal status-aware search service**

Refactor `fetchAndNormalize()` and `safeSearch()` so they return a full bundle:

```ts
if (results.length === 0) {
  return {
    status: "empty",
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
```

On provider failure:

```ts
return {
  status: "degraded",
  query,
  intent,
  freshness,
  results: [],
  seoKeywords: [],
  crowdedness: "low",
  staleBuzzwords: [],
  notes: [],
};
```

On normal results, keep `buildSearchReferenceBundle(...)` but add `status: "success"` and `freshness`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/search/service.test.ts`
Expected: PASS for all three status variants.

---

### Task 5: Teach AI Service to Inject Search Context Only on True Success

**Files:**
- Modify: `lib/ai/service.ts`
- Modify: `lib/ai/service.test.ts`

- [ ] **Step 1: Write the failing tests**

Add tests that:
- when search returns `status: "success"`, provider input receives populated `searchContext`
- when search returns `status: "degraded"`, provider input receives `searchContext: null`
- when search returns `status: "empty"`, provider input receives `searchContext: null`

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/ai/service.test.ts`
Expected: FAIL because the AI service still assumes search returns `SearchReferenceBundle | null`.

- [ ] **Step 3: Implement minimal AI-service adaptation**

In `lib/ai/service.ts`, update each search-enabled method to:
- call the new search service
- derive:

```ts
const searchResult = await searchForTopics(...);
const searchContext =
  searchResult.status === "success" ? searchResult : null;
```

- pass `searchContext` to the provider
- include the raw `searchResult.status` in the API-facing response for enabled stages

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/ai/service.test.ts`
Expected: PASS and provider payloads should only include references on `success`.

---

### Task 6: Surface Degraded Search Status to the Frontend

**Files:**
- Modify: `types/ai.ts`
- Modify: `lib/ai/schemas.ts`
- Modify: `lib/ai/client.ts`
- Modify: `components/hooks/use-workflow.ts`
- Modify: `components/app-client.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add a workflow test proving:
- topics generation still succeeds when search degrades
- the UI state sets a non-blocking message like `联网增强暂不可用，本次生成已自动降级为基础模式`
- the actual generation result is still rendered normally

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/app-client.test.tsx`
Expected: FAIL because no search-status metadata is exposed to the hook.

- [ ] **Step 3: Implement minimal frontend propagation**

Extend `GenerateTopicsOutput`, `GenerateBriefOutput`, `GenerateOutlineOutput`, and `GenerateTitlesAndSummariesOutput` with an optional field:

```ts
searchStatus?: "success" | "degraded" | "empty";
```

Update Zod response schemas accordingly.

In `useWorkflow`, after a successful generation call:
- if `result.searchStatus === "degraded"`, keep the main content update
- set a user-visible soft warning via `setError("联网增强暂不可用，本次生成已自动降级为基础模式。")`

Keep this message non-fatal: it should not block the stage transition.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/app-client.test.tsx`
Expected: PASS and the degraded message should coexist with successful generated content.

---

### Task 7: Run Verification and Document Any Gaps

**Files:**
- No code changes required unless verification reveals an issue.

- [ ] **Step 1: Run targeted test suites**

Run: `npx vitest run lib/search/service.test.ts lib/ai/service.test.ts components/app-client.test.tsx`
Expected: PASS

- [ ] **Step 2: Run the broader regression suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 3: Run static checks**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 4: Run production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/search/types.ts lib/search/generic-provider.ts lib/search/service.ts lib/search/service.test.ts lib/ai/service.ts lib/ai/service.test.ts types/ai.ts lib/ai/schemas.ts lib/ai/client.ts components/hooks/use-workflow.ts components/app-client.test.tsx docs/superpowers/specs/2026-06-03-network-search-quality-gate-design.md docs/superpowers/plans/2026-06-03-network-search-quality-gate-implementation.md
git commit -m "feat: tighten network search quality gates"
```
