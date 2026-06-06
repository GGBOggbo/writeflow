# Network Search Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add controlled network-search enhancement to the AI writing MVP so `topics` and `meta` can reference fresh web context by default, `brief`/`outline` can opt in manually later, and `draft` stays permanently offline.

**Architecture:** Introduce a dedicated `lib/search/*` layer that fetches and normalizes search references independently from the AI provider layer. Thread a small `searchEnabled/searchMode` contract through the allowed generation stages, inject sanitized search context only into `topics` and `meta` prompts for this phase, and gracefully fall back to base generation when search fails.

**Tech Stack:** Next.js App Router route handlers, React client state via `useWorkflow` + Context, TypeScript, Zod, Vitest.

---

## File Map

### New files

- `lib/search/types.ts`
  - Search result contracts, search source enum, search context envelope.
- `lib/search/provider.ts`
  - Search provider interface and provider name types.
- `lib/search/mock-provider.ts`
  - Deterministic fallback/search-fixture provider for tests and local fallback.
- `lib/search/service.ts`
  - Provider selection, request orchestration, graceful fallback helpers.
- `lib/search/generic-provider.ts`
  - First real provider implementation for a generic/hotlist-capable source.
- `lib/search/normalize.ts`
  - Result shaping, dedupe, buzzword detection, crowdedness scoring, SEO keyword extraction.
- `lib/search/service.test.ts`
  - Unit tests for fallback, source tagging, normalization, and failure downgrade.
- `components/search-toggle.tsx`
  - Reusable UI toggle with disabled/help states.

### Modified files

- `types/ai.ts`
  - Add search flags and normalized search context types to `topics` and `meta` inputs; pre-wire optional fields for `brief`/`outline`.
- `types/workflow.ts`
  - Add per-stage search settings to workflow state.
- `lib/ai/schemas.ts`
  - Add request schema fields for search-enabled stages.
- `lib/ai/client.ts`
  - Pass new search fields to API routes.
- `lib/ai/prompts/topics.ts`
  - Accept sanitized search context and inject fresh-reference rules.
- `lib/ai/prompts/meta.ts`
  - Accept sanitized search context and inject fresh-reference rules plus buzzword guardrails.
- `components/hooks/use-workflow.ts`
  - Initialize search defaults, pass search config in topics/meta generation calls.
- `lib/state-machine.ts`
  - Ensure reset/regenerate flows preserve or reset search settings correctly.
- `lib/storage/workflow-storage.ts`
  - Persist and normalize search settings in localStorage.
- `components/stages/idea-stage.tsx`
  - Show `topics` search toggle near generate action.
- `components/stages/meta-stage.tsx`
  - Show `meta` search toggle near generate action.
- `components/stages/brief-stage.tsx`
  - Show disabled/off-by-default “联网增强” affordance for future manual use.
- `components/stages/outline-stage.tsx`
  - Show disabled/off-by-default “联网增强” affordance for future manual use.
- `components/stages/draft-stage.tsx`
  - Show hard-offline message for draft stage.
- `components/app-client.test.tsx`
  - Cover search-setting propagation and graceful fallback.
- `README.md`
  - Document search enhancement behavior, defaults, and fallback.

---

### Task 1: Add Search Domain Skeleton

**Files:**
- Create: `lib/search/types.ts`
- Create: `lib/search/provider.ts`
- Create: `lib/search/mock-provider.ts`
- Create: `lib/search/normalize.ts`
- Create: `lib/search/service.ts`
- Test: `lib/search/service.test.ts`

- [ ] **Step 1: Write the failing tests**

Add tests for:
- fallback to mock/empty references when the real provider throws
- preserving `source` and `engagementMetrics`
- extracting `seoKeywords`
- tagging `staleBuzzwords` and `crowdedness`

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/search/service.test.ts`
Expected: FAIL because the search files do not exist yet.

- [ ] **Step 3: Write minimal search contracts and service**

Implement:
- `SearchSource`
- `SearchResult`
- `SearchReferenceBundle`
- `SearchProvider`
- `searchForTopics(...)`
- `searchForMeta(...)`
- graceful fallback to mock/empty references

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/search/service.test.ts`
Expected: PASS

### Task 2: Thread Search Settings Through Workflow State

**Files:**
- Modify: `types/workflow.ts`
- Modify: `lib/state-machine.ts`
- Modify: `lib/storage/workflow-storage.ts`
- Modify: `components/hooks/use-workflow.ts`
- Test: existing workflow storage/state tests

- [ ] **Step 1: Write the failing tests**

Add tests for:
- default search settings by stage
- state reset preserving defaults
- localStorage restore for missing/legacy search fields

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/state-machine.test.ts lib/storage/workflow-storage.test.ts`
Expected: FAIL on missing `searchSettings`.

- [ ] **Step 3: Implement minimal workflow state support**

Add:
- `searchSettings` to `WorkflowState`
- defaults:
  - `topics: true`
  - `brief: false`
  - `outline: false`
  - `meta: true`
- normalization in restore logic

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/state-machine.test.ts lib/storage/workflow-storage.test.ts`
Expected: PASS

### Task 3: Add Search Toggle UI

**Files:**
- Create: `components/search-toggle.tsx`
- Modify: `components/stages/idea-stage.tsx`
- Modify: `components/stages/meta-stage.tsx`
- Modify: `components/stages/brief-stage.tsx`
- Modify: `components/stages/outline-stage.tsx`
- Modify: `components/stages/draft-stage.tsx`

- [ ] **Step 1: Write the failing UI tests**

Cover:
- topics toggle visible and enabled
- meta toggle visible and enabled
- brief/outline toggle visible but off-by-default for future use
- draft stage shows offline-only hint

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/*.test.tsx components/stages/*.test.tsx`
Expected: FAIL on missing toggle UI.

- [ ] **Step 3: Implement the minimal UI**

Add a reusable toggle and wire it to workflow state setters.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/*.test.tsx components/stages/*.test.tsx`
Expected: PASS for new toggle expectations.

### Task 4: Extend AI Contracts for Search-Enabled Topics and Meta

**Files:**
- Modify: `types/ai.ts`
- Modify: `lib/ai/schemas.ts`
- Modify: `lib/ai/client.ts`
- Modify: `components/hooks/use-workflow.ts`
- Test: `lib/ai/service.test.ts`, client-facing tests

- [ ] **Step 1: Write failing contract tests**

Add expectations that:
- topics request accepts `searchEnabled`, `searchMode`, and optional search references
- meta request accepts the same
- draft remains free of search payload fields

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/ai/service.test.ts`
Expected: FAIL on schema mismatch.

- [ ] **Step 3: Implement contract changes**

Update the input types and request schemas, then pass the new fields from `useWorkflow`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/ai/service.test.ts`
Expected: PASS

### Task 5: Inject Search Context into Topics and Meta Prompts

**Files:**
- Modify: `lib/ai/prompts/topics.ts`
- Modify: `lib/ai/prompts/meta.ts`
- Test: `lib/ai/prompts/topics.test.ts`, `lib/ai/prompts/meta.test.ts`

- [ ] **Step 1: Write failing prompt tests**

Assert that:
- `topics` prompt includes fresh references only when search is enabled
- `meta` prompt includes high-engagement references, SEO keywords, and stale-buzzword warnings only when present

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/ai/prompts/topics.test.ts lib/ai/prompts/meta.test.ts`
Expected: FAIL because prompt builders do not yet mention search references.

- [ ] **Step 3: Implement minimal prompt injection**

Add:
- “最新参考信息” sections
- “只供参考，不可伪装成第一手经历” rules
- stale-buzzword guardrail text

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/ai/prompts/topics.test.ts lib/ai/prompts/meta.test.ts`
Expected: PASS

### Task 6: Connect Search Service Before Topics/Meta Generation

**Files:**
- Modify: `components/hooks/use-workflow.ts`
- Modify: `app/api/ai/topics/route.ts`
- Modify: `app/api/ai/meta/route.ts`
- Potentially modify: `lib/ai/service.ts`
- Test: `components/app-client.test.tsx`, `lib/search/service.test.ts`

- [ ] **Step 1: Write failing integration tests**

Cover:
- topics request uses search references when enabled
- meta request uses search references when enabled
- provider/search failure still yields generation via degraded path

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/app-client.test.tsx lib/search/service.test.ts`
Expected: FAIL because search is not yet consulted.

- [ ] **Step 3: Implement minimal orchestration**

Before generation:
- fetch search references for topics/meta when enabled
- on failure, continue with base generation and set a soft warning message

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/app-client.test.tsx lib/search/service.test.ts`
Expected: PASS

### Task 7: Documentation and Verification

**Files:**
- Modify: `README.md`
- Modify: `progress.md`

- [ ] **Step 1: Document the feature**

Add:
- default search behavior by stage
- fallback behavior
- note that draft is permanently offline

- [ ] **Step 2: Run full verification**

Run:
- `npx vitest run`
- `npm run lint`
- `npm run build`

Expected:
- all tests pass
- lint passes
- build passes
