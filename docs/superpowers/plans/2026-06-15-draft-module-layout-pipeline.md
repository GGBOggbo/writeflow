# Draft Module Layout Pipeline Implementation Plan

> **For Codex:** Execute this plan with `executing-plans`, using TDD and preserving unrelated worktree changes.

**Goal:** Automatically convert each generated plain-text draft into validated GFM Markdown plus supported `:::` modules before it reaches the editor and local preview, without a button or extra credit charge.

**Architecture:** Add a focused draft-module-layout orchestrator between draft generation and response serialization. It calls the existing formatting model, validates content and syntax, retries once with concrete feedback, and produces deterministic basic Markdown if both AI attempts fail.

**Tech Stack:** TypeScript, Next.js, Vitest, existing AI provider abstraction, existing extended Markdown parser/renderer.

---

### Task 1: Strengthen post-processing validation

**Files:**
- Modify: `lib/ai/markdown-post-processing.ts`
- Modify: `lib/ai/markdown-post-processing.test.ts`

**Steps:**
1. Keep the existing failing test proving that a plain-text echo is not a successful formatting result.
2. Add tests for an unknown `:::` module and an unclosed module.
3. Add `insufficient_markdown_structure` and invalid-module reasons to the validation result.
4. Require meaningful Markdown structure while preserving existing content, placeholder, HTML, and module checks.
5. Run:
   `npx vitest run lib/ai/markdown-post-processing.test.ts`

### Task 2: Add retry feedback to the provider contract and prompt

**Files:**
- Modify: `lib/ai/provider.ts`
- Modify: `lib/ai/prompts/markdown-draft.ts`
- Modify: `lib/ai/prompts/markdown-draft.test.ts`
- Modify: `lib/ai/real-provider.ts`
- Modify: `lib/ai/mock-provider.ts`
- Modify: `lib/ai/real-provider.test.ts`

**Steps:**
1. Keep the failing prompt test for `qualityFeedback`.
2. Add a provider option type with optional validation feedback.
3. Render a concise “上一次排版不合格” correction block only on retry.
4. Pass options through real and mock providers without changing credit behavior.
5. Assert the retry feedback reaches the model request.
6. Run:
   `npx vitest run lib/ai/prompts/markdown-draft.test.ts lib/ai/real-provider.test.ts`

### Task 3: Build the standalone module-layout orchestrator

**Files:**
- Create: `lib/ai/draft-module-layout.ts`
- Create: `lib/ai/draft-module-layout.test.ts`
- Modify: `lib/ai/service.ts`
- Modify: `lib/ai/service.test.ts`

**Steps:**
1. Test successful first-pass formatting.
2. Keep the failing service test proving a plain first result triggers a second call with feedback.
3. Test two invalid results produce deterministic valid basic Markdown.
4. Test placeholders survive all paths.
5. Implement the orchestrator:
   - protect placeholders;
   - call formatter with the original plain draft;
   - restore and validate;
   - retry once using validation feedback;
   - fall back to local basic Markdown;
   - return source, attempt count, and validation metadata.
6. Replace inline formatting logic in `generateDraft()` with the module.
7. Log whether the final source is `ai`, `ai_retry`, or `local_fallback`.
8. Run:
   `npx vitest run lib/ai/draft-module-layout.test.ts lib/ai/service.test.ts`

### Task 4: Verify editor and renderer compatibility

**Files:**
- Modify if needed: `lib/formatting/render-extended-markdown.test.ts`
- Modify if needed: `components/stages/draft-stage.test.tsx`

**Steps:**
1. Add an integration assertion that the fallback and valid AI output render without leaking raw `:::` syntax.
2. Confirm the draft stage still receives one Markdown string and performs local live preview only.
3. Confirm no `/api/ai/format` route, formatting button, or extra credit operation is reintroduced.
4. Run focused renderer and draft-stage tests.

### Task 5: Full verification and documentation

**Files:**
- Modify: `docs/superpowers/specs/2026-06-15-draft-module-layout-pipeline-design.md` only if implementation details differ.
- Modify: `progress.md`
- Modify: `task_plan.md`

**Steps:**
1. Run `npm test`.
2. Run `npm run lint`.
3. Run `npm run build`.
4. Inspect `git diff --check` and `git status --short`.
5. Record the implementation and verification results without staging unrelated WIP.
