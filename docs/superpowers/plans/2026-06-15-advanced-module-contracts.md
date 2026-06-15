# Advanced Module Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish one runtime contract source for all 31 advanced Markdown modules and reject truncated or structurally invalid AI layout output before preview.

**Architecture:** `MODULE_DEFS` describes field, row, image-body, and dialogue modules. The same definitions generate compact AI instructions and validate parsed module nodes; the existing renderer remains unchanged. The text provider rejects `finish_reason=length`, retries internally, and otherwise lets the existing local fallback protect delivery.

**Tech Stack:** TypeScript, Vitest, existing advanced Markdown parser, DeepSeek/Mimo OpenAI-compatible API.

---

### Task 1: Add the complete module contract source

**Files:**
- Create: `lib/markdown/module-defs.ts`
- Create: `lib/markdown/module-defs.test.ts`
- Read contract evidence: `lib/formatting/advanced-module-render.ts`
- Read fixtures: `lib/formatting/fixtures/md2wechat-all-modules.md`

- [ ] Write failing tests asserting all 31 names exist exactly once and representative field/row/body definitions expose required and optional structure.
- [ ] Run `npx vitest run lib/markdown/module-defs.test.ts` and confirm imports/functions are missing.
- [ ] Implement typed `MODULE_DEFS`, `ADVANCED_MODULE_NAMES`, `isAdvancedModuleName()`, and compact contract formatting.
- [ ] Parse the complete fixture and assert all 31 modules satisfy their definitions.
- [ ] Run the focused tests until green.

### Task 2: Validate parsed modules against the contracts

**Files:**
- Modify: `lib/markdown/advanced-modules.ts`
- Modify: `lib/markdown/advanced-modules.test.ts`
- Modify: `lib/ai/markdown-post-processing.ts`
- Modify: `lib/ai/markdown-post-processing.test.ts`

- [ ] Write failing tests for unknown fields, missing required fields, duplicate non-repeatable fields, invalid row widths, empty row modules, invalid image bodies, and invalid dialogue lines.
- [ ] Run focused tests and confirm current permissive parser/validator accepts the bad modules.
- [ ] Add `validateAdvancedModuleNode()` and document-level contract validation using `MODULE_DEFS`.
- [ ] Keep parser behavior editable and non-throwing; enforce rejection in post-processing.
- [ ] Return `invalid_module_contract` from Markdown validation and preserve existing `module_changed` behavior for source modules.
- [ ] Run both focused suites until green.

### Task 3: Generate AI module instructions from the same source

**Files:**
- Modify: `lib/ai/prompts/markdown-draft.ts`
- Modify: `lib/ai/prompts/markdown-draft.test.ts`
- Modify: `lib/ai/draft-module-layout.ts`
- Modify: `lib/ai/draft-module-layout.test.ts`

- [ ] Write failing prompt tests for `verdict`, `cards`, `gallery`, and `dialogue` contracts plus field/row/body examples.
- [ ] Write a failing retry test expecting the concrete module-contract failure in `qualityFeedback`.
- [ ] Generate the compact 31-line contract from `MODULE_DEFS`.
- [ ] Add three syntax examples and explicit paragraph-priority rules.
- [ ] Change the existing-module rule to apply only when the input already contains a valid module.
- [ ] Map `invalid_module_contract` to actionable retry feedback.
- [ ] Run prompt and orchestrator tests until green.

### Task 4: Reject truncated text completions

**Files:**
- Modify: `lib/ai/real-provider.ts`
- Modify: `lib/ai/real-provider.test.ts`

- [ ] Write a failing request test expecting `max_completion_tokens: 4096`.
- [ ] Write a failing test where the first response has `finish_reason: "length"` and the second succeeds.
- [ ] Write a failing test where both responses are truncated and the provider rejects.
- [ ] Extend the response type with `finish_reason` and optional usage.
- [ ] Reject truncated output before stripping/returning content.
- [ ] Log `finishReason` and `completionTokens` without logging content.
- [ ] Run real-provider tests until green.

### Task 5: Integration and verification

**Files:**
- Modify if needed: `lib/ai/service.test.ts`
- Modify: `progress.md`
- Modify: `task_plan.md`

- [ ] Add or update integration coverage proving invalid module contracts retry once and repeated truncation reaches local fallback without extra credit.
- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check`.
- [ ] Record final behavior and verification counts without staging unrelated worktree changes.
