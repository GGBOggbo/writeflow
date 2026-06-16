# Prompt-Led Draft Formatting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove code-generated article modules so AI editorial formatting is the only source of new `:::` modules, while retaining validation, retry, safe fallback, and rendering.

**Architecture:** Keep `layoutDraftModules()` as the formatting orchestrator, but reduce it to source normalization, protected-token handling, provider calls, validation, retry, and conservative Markdown fallback. Move editorial choices entirely into `buildMarkdownDraftPrompt()` and report only modules present in accepted AI output.

**Tech Stack:** TypeScript, Vitest, Next.js application code, GFM Markdown, custom `:::` advanced modules.

---

### Task 1: Lock Prompt-Led Module Behavior

**Files:**
- Modify: `lib/ai/draft-module-layout.test.ts`
- Modify: `lib/ai/prompts/markdown-draft.test.ts`

- [x] **Step 1: Replace automatic-module expectations with no-injection expectations**

Add assertions proving that a valid AI response without `:::` modules remains
module-free, including a long article with a judgment, CTA-like ending, and a
candidate sentence in the first 600 characters.

- [x] **Step 2: Replace the fixed module-density prompt expectation**

Assert that the prompt tells the AI to identify the article skeleton, preserve
the conversational opening, choose modules by reading task, and use no module
when the source does not support one. Assert that it no longer requires at
least four modules.

- [x] **Step 3: Run focused tests and verify RED**

Run:

```bash
npx vitest run lib/ai/draft-module-layout.test.ts lib/ai/prompts/markdown-draft.test.ts
```

Expected: failures show that code still injects `quote`, `verdict`, or `cta`,
and the prompt still contains the fixed four-module floor.

### Task 2: Remove Code-Generated Editorial Modules

**Files:**
- Modify: `lib/ai/draft-module-layout.ts`

- [x] **Step 1: Delete automatic editorial extraction**

Remove the regex candidate detectors and the functions that synthesize
`quote`, `verdict`, and `cta` modules. Keep module statistics and source-module
protection.

- [x] **Step 2: Return the validated AI result directly**

After content and contract validation, return the restored AI output without
post-processing it into new modules. Keep removal of legacy generic eyebrow
labels only for AI-created modules when the source had no modules.

- [x] **Step 3: Keep conservative fallback module-free**

Retain heading promotion and limited Markdown emphasis in
`buildBasicMarkdownFallback()`. Do not add any advanced module.

- [x] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
npx vitest run lib/ai/draft-module-layout.test.ts
```

Expected: all draft layout tests pass.

### Task 3: Make the Prompt Own Editorial Decisions

**Files:**
- Modify: `lib/ai/prompts/markdown-draft.ts`

- [x] **Step 1: Add article-skeleton instructions**

Tell the AI to identify the source skeleton before formatting and map modules
to reading tasks rather than visual decoration.

- [x] **Step 2: Protect the opening and factual boundary**

Tell the AI to keep the opening conversational unless the source itself
supports a stronger module, forbid implied quantified outcomes, and allow no
module when the source is insufficient.

- [x] **Step 3: Remove fixed density**

Delete the requirement that long articles use at least four advanced modules.
Keep the 600-character reading-anchor guidance, where headings and restrained
GFM emphasis also count as anchors.

- [x] **Step 4: Run prompt tests and verify GREEN**

Run:

```bash
npx vitest run lib/ai/prompts/markdown-draft.test.ts
```

Expected: all prompt tests pass.

### Task 4: Align the Product Label and Regression Coverage

**Files:**
- Modify: `components/stages/draft-stage.tsx`
- Modify: `components/stages/draft-stage.test.tsx`
- Modify: `lib/ai/service.test.ts` if logging expectations require alignment

- [x] **Step 1: Rename the action**

Change the button label from `AI 排版（免费）` to
`AI 编辑排版（免费）`, including its loading copy and supporting text where
needed.

- [x] **Step 2: Update UI tests**

Assert the new label and preserve the existing free-action behavior.

- [x] **Step 3: Run focused UI and service tests**

Run:

```bash
npx vitest run components/stages/draft-stage.test.tsx lib/ai/service.test.ts
```

Expected: all tests pass and logs continue to report actual module statistics.

### Task 5: Full Verification and Planning Record

**Files:**
- Modify: `progress.md`
- Modify: `task_plan.md`

- [x] **Step 1: Run full verification**

Run:

```bash
npm test
npm run lint
npm run build
git diff --check
```

Expected: all commands pass.

- [x] **Step 2: Record the completed behavior**

Document that AI is now the sole creator of new editorial modules, code only
validates and renders, and fallback remains module-free.

- [x] **Step 3: Review the scoped diff**

Confirm no unrelated dirty files were reverted, staged, or rewritten.
