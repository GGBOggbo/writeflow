# AI Markdown Post-processing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate draft content first, then automatically run a free internal AI pass that converts it to publication-ready GFM Markdown without changing its substance.

**Architecture:** Keep `/api/ai/draft` as the only public operation and credit boundary. Add a text-returning `formatDraftMarkdown` provider method, call it inside `generateDraft`, validate preservation deterministically, and fall back to the original plain draft on any formatting error.

**Tech Stack:** TypeScript, Next.js route handlers, Vitest, Zod, OpenAI-compatible DeepSeek/Mimo chat completions, Pino structured logging.

---

### Task 1: Separate draft writing and Markdown formatting prompts

**Files:**
- Create: `lib/ai/prompts/markdown-draft.ts`
- Create: `lib/ai/prompts/markdown-draft.test.ts`
- Modify: `lib/ai/prompts/draft.ts`
- Modify: `lib/ai/prompts/draft.test.ts`

- [ ] Write failing tests proving the draft prompt forbids Markdown formatting and the Markdown prompt requires mobile rhythm, restrained emphasis, placeholder preservation, prompt-injection resistance, and Markdown-only output.
- [ ] Run `npm test -- lib/ai/prompts/draft.test.ts lib/ai/prompts/markdown-draft.test.ts` and verify failure because the new prompt does not exist and the draft prompt still owns formatting.
- [ ] Add `buildMarkdownDraftPrompt(content)` and remove Markdown/editorial formatting rules from `buildDraftPrompt` while retaining JSON output rules.
- [ ] Re-run the focused prompt tests and verify they pass.

### Task 2: Add a plain-text provider call

**Files:**
- Modify: `lib/ai/provider.ts`
- Modify: `lib/ai/real-provider.ts`
- Modify: `lib/ai/real-provider.test.ts`
- Modify: `lib/ai/mock-provider.ts`

- [ ] Write a failing provider test proving `formatDraftMarkdown` uses `deepseek-v4-pro`, requests plain Markdown rather than JSON, and removes accidental outer code fences.
- [ ] Run `npm test -- lib/ai/real-provider.test.ts` and verify failure because the provider method is missing.
- [ ] Add `formatDraftMarkdown(content): Promise<string>` to `AIProvider`, implement a focused text completion helper with existing size-only logs and limited retries, and add a deterministic mock implementation.
- [ ] Re-run the provider tests and verify they pass.

### Task 3: Validate formatted Markdown and degrade safely

**Files:**
- Create: `lib/ai/markdown-post-processing.ts`
- Create: `lib/ai/markdown-post-processing.test.ts`
- Modify: `lib/ai/service.ts`
- Modify: `lib/ai/service.test.ts`
- Modify: `lib/progress/types.ts`

- [ ] Write failing tests for successful replacement, provider failure fallback, empty output fallback, dangerous HTML fallback, placeholder mutation fallback, and substantial content-loss fallback.
- [ ] Run the focused tests and verify they fail before service integration.
- [ ] Implement normalization and preservation validation, then call the provider once per generated draft inside `generateDraft` with `markdown_formatting_started`, `markdown_formatting_completed`, or `markdown_formatting_degraded` progress events.
- [ ] Log only status, reason, duration, and character counts; never log draft text.
- [ ] Re-run focused service and validation tests and verify they pass.

### Task 4: Verify the single-credit boundary and regressions

**Files:**
- Modify only if necessary: `app/api/ai/ai-routes.test.ts`

- [ ] Add or tighten the draft route assertion that one complete request, including internal Markdown formatting, calls credit consumption exactly once.
- [ ] Run `npm test -- app/api/ai/ai-routes.test.ts` and verify it passes.
- [ ] Run `npm test && npm run lint && npm run build && git diff --check`.
- [ ] Review the final diff to ensure no public free formatting endpoint, database migration, or unrelated file change was introduced.
