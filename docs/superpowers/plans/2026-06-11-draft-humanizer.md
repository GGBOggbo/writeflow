# Draft Humanizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second editorial model pass that removes AI-writing patterns from generated body copy while safely falling back to the original draft.

**Architecture:** A dedicated Humanizer prompt and provider method perform the second request. The draft service validates identity and placeholders, owns fallback behavior, and returns a status consumed by the existing progress and notice UI.

**Tech Stack:** Next.js 16, TypeScript, Zod, React 19, Vitest

---

### Task 1: Humanizer Contract and Prompt

**Files:**
- Create: `lib/ai/prompts/humanize-draft.ts`
- Modify: `types/ai.ts`
- Modify: `lib/ai/schemas.ts`
- Modify: `lib/ai/provider.ts`
- Modify: `lib/ai/service.test.ts`

- [x] Add a failing test that inspects the second request and requires preservation constraints plus condensed Humanizer rules.
- [x] Run `npm test -- lib/ai/service.test.ts` and verify only the new behavior fails.
- [x] Add the humanization input/output types, response status, schema, provider method, and focused prompt builder.
- [x] Run the focused test and verify it passes.

### Task 2: Second Model Pass and Safe Fallback

**Files:**
- Modify: `lib/ai/real-provider.ts`
- Modify: `lib/ai/provider.ts`
- Modify: `lib/ai/service.ts`
- Modify: `lib/ai/service.test.ts`

- [x] Add failing tests for successful replacement, request failure fallback, and placeholder mutation fallback.
- [x] Run `npm test -- lib/ai/service.test.ts` and verify the expected failures.
- [x] Implement the second provider request and service-level validation for draft count, IDs, labels, and placeholders.
- [x] Catch humanization failures, return original drafts, and expose `humanizationStatus: "degraded"`.
- [x] Run the focused tests and verify they pass.

### Task 3: Progress and User Notice

**Files:**
- Modify: `lib/progress/types.ts`
- Modify: `components/generation-pulse.tsx`
- Modify: `components/generation-pulse.test.tsx`
- Modify: `components/hooks/use-workflow.ts`
- Modify: `components/app-client.test.tsx`

- [x] Add failing tests for the `去掉机器腔` progress step and degraded humanization notice.
- [x] Run the focused component tests and verify the new assertions fail.
- [x] Add humanization progress event IDs, map them to the new step, and show a non-blocking notice after fallback.
- [x] Run the focused component tests and verify they pass.

### Task 4: Regression Verification

**Files:**
- Modify only files required by failures caused by Tasks 1-3.

- [x] Run `npm test`.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.
- [x] Run `git diff --check`.
- [x] Confirm the draft route still reserves and consumes one operation around both model calls.
