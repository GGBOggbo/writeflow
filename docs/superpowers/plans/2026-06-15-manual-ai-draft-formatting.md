# Manual AI Draft Formatting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate article writing from Markdown/module formatting so users explicitly trigger a free AI formatting pass and receive a distinct `排版版` without changing the source draft.

**Architecture:** `generateDraft` returns the provider's written content unchanged. A new authenticated, unmetered `format-draft` API runs the existing Markdown/module layout pipeline, returns one formatted draft version, and the workflow reducer replaces the previous `排版版` while preserving all other versions.

**Tech Stack:** Next.js Route Handlers, React 19, TypeScript, Zod, Vitest, existing AI provider and `layoutDraftModules` pipeline.

---

### Task 1: Split the server workflow

**Files:**
- Modify: `types/ai.ts`
- Modify: `lib/ai/schemas.ts`
- Modify: `lib/ai/service.ts`
- Test: `lib/ai/service.test.ts`
- Test: `lib/ai/schemas.test.ts`

- [ ] Add a failing test proving draft generation does not call Markdown formatting.
- [ ] Add a failing test for a standalone formatter returning a labeled `排版版` and preserving the source draft.
- [ ] Add input/output types and Zod schemas for the standalone operation.
- [ ] Move the existing `layoutDraftModules` orchestration and logging into `formatDraft`.
- [ ] Run the focused service and schema tests.

### Task 2: Expose a free API and client

**Files:**
- Create: `app/api/ai/format-draft/route.ts`
- Create: `app/api/ai/format-draft/stream/route.ts`
- Modify: `lib/ai/client.ts`
- Test: `app/api/ai/ai-routes.test.ts`
- Test: `lib/ai/client.test.ts`

- [ ] Add failing route and client tests for `/api/ai/format-draft/stream`.
- [ ] Route through `authenticatedJsonResponse` and `authenticatedStreamJsonResponse`, not metered helpers.
- [ ] Parse the response with the dedicated schema.
- [ ] Verify no reserve, consume, refund, or credits stream event occurs.

### Task 3: Add the manual workflow action

**Files:**
- Modify: `types/workflow.ts`
- Modify: `lib/state-machine.ts`
- Modify: `components/hooks/use-workflow.ts`
- Test: `lib/state-machine.test.ts`

- [ ] Add a failing reducer test proving a new `排版版` replaces the old one and becomes selected.
- [ ] Add `draft_formatted` and `format_draft` actions.
- [ ] Implement the hook handler, progress state, retry path, and non-destructive error message.
- [ ] Run focused workflow tests.

### Task 4: Replace the local button with AI formatting

**Files:**
- Modify: `components/stages/draft-stage.tsx`
- Modify: `components/stages/draft-stage.test.tsx`

- [ ] Replace local-normalization tests with a failing editor-header AI formatting test.
- [ ] Remove local normalization state and button behavior from the component.
- [ ] Add `AI 排版（免费）` to the editor header with loading feedback and explanatory copy.
- [ ] Verify the button is not placed in the bottom workflow actions.

### Task 5: Full verification

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check`.
- [ ] Open the local draft stage and verify the button, version switch, editor content, and preview behavior in the browser.
