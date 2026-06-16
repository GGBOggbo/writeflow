# AI Material Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a free post-draft action that conservatively fills supported material placeholders and saves the result as a new selectable draft version.

**Architecture:** Follow the existing humanize-draft vertical slice but give material completion its own prompt, provider method, service validation, unmetered stream route, workflow action, and state event. The source draft is immutable; successful output is appended as a derived version, every placeholder is removed, and unsupported personal material becomes a clearly non-personal general or hypothetical passage.

**Tech Stack:** Next.js App Router, TypeScript, Zod, React, Vitest, Testing Library, existing stream API helpers and AI provider abstraction.

---

### Task 1: Define the prompt and contracts

**Files:**
- Create: `lib/ai/prompts/complete-materials.ts`
- Create: `lib/ai/prompts/complete-materials.test.ts`
- Modify: `types/ai.ts`
- Modify: `lib/ai/schemas.ts`
- Modify: `lib/ai/schemas.test.ts`

- [ ] Write tests proving the prompt allows only evidence-backed completion, forbids invented personal/customer stories and preserves unsupported placeholders.
- [ ] Run `npx vitest run lib/ai/prompts/complete-materials.test.ts lib/ai/schemas.test.ts` and verify failures are caused by the missing prompt/contracts.
- [ ] Add `CompleteDraftMaterialsInput/Output`, request/response schemas, provider-response schema, and the prompt builder.
- [ ] Run the same test command and verify it passes.

### Task 2: Add provider and service behavior

**Files:**
- Modify: `lib/ai/provider.ts`
- Modify: `lib/ai/real-provider.ts`
- Modify: `lib/ai/mock-provider.ts`
- Modify: `lib/ai/service.ts`
- Modify: `lib/ai/service.test.ts`
- Modify: `lib/ai/real-provider.test.ts`

- [ ] Write failing tests for a successful derived draft, partial placeholder preservation, empty output rejection, and DeepSeek Pro routing.
- [ ] Run the focused provider/service tests and verify the missing method causes RED.
- [ ] Implement `completeDraftMaterials`, validate that output is non-empty, and reject removal of every placeholder when the response gives no substantive replacement.
- [ ] Assign a collision-resistant derived ID and label the version `AI 补充版`.
- [ ] Run the focused tests and verify GREEN.

### Task 3: Expose a free stream API

**Files:**
- Create: `app/api/ai/complete-materials/route.ts`
- Create: `app/api/ai/complete-materials/stream/route.ts`
- Modify: `app/api/ai/ai-routes.test.ts`
- Modify: `lib/ai/client.ts`
- Modify: `lib/ai/client.test.ts`

- [ ] Write failing route/client tests proving the stream endpoint returns a parsed result and never invokes credit reservation or settlement.
- [ ] Run the focused route/client tests and verify RED.
- [ ] Implement the routes with the existing non-metered request/stream wrappers and add the client function without a credit callback.
- [ ] Run the focused tests and verify GREEN.

### Task 4: Persist a derived draft version

**Files:**
- Modify: `types/workflow.ts`
- Modify: `lib/state-machine.ts`
- Modify: `lib/state-machine.test.ts`
- Modify: `lib/storage/workflow-storage.test.ts`

- [ ] Write a failing reducer test proving the source draft remains, the completed draft is appended/replaced by ID, and the completed draft becomes selected.
- [ ] Run the state/storage tests and verify RED.
- [ ] Add a `draft_materials_completed` event and reducer branch using the same immutable derived-version pattern as humanization.
- [ ] Run the state/storage tests and verify GREEN.

### Task 5: Add workflow action and conditional UI

**Files:**
- Modify: `components/hooks/use-workflow.ts`
- Modify: `components/workflow-context.tsx`
- Modify: `components/stages/draft-stage.tsx`
- Modify: `components/stages/draft-stage.test.tsx`
- Modify: `components/app-client.test.tsx`
- Modify: `components/generation-pulse.tsx`

- [ ] Write failing tests proving “AI 补充素材” appears only when the active draft contains a material placeholder, calls the free action, shows loading state, and selects the returned version.
- [ ] Run the focused UI tests and verify RED.
- [ ] Add `complete_draft_materials` request state, handler, context export, conditional button, progress copy, and failure message.
- [ ] Pass the selected draft plus topic, Brief, outline and reusable search context to the client.
- [ ] Run the focused UI tests and verify GREEN.

### Task 6: Verify the integrated feature

**Files:**
- Modify only files required by failures found during verification.

- [ ] Run `npm test` and confirm all test files pass.
- [ ] Run `npm run lint` and confirm zero lint errors.
- [ ] Run `npm run build` and confirm the Next.js production build completes.
- [ ] Inspect `git diff --check` and the scoped diff to ensure no unrelated work was staged or reverted.
