# Local Markdown Live Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the paid AI semantic-formatting workflow with a left-side Markdown editor and right-side deterministic live WeChat preview.

**Architecture:** `DraftStage` owns the active Markdown value and persists edits through the existing `draft_updated` transition. `WechatFormatPanel` receives only source Markdown and always calls `renderExtendedMarkdown()`. The separate `format_draft` client/API/service/provider/state chain is deleted, while generation-time `formatDraftMarkdown()` remains unchanged.

**Tech Stack:** React 19, Next.js 16, TypeScript, Marked, sanitize-html, Vitest.

---

### Task 1: Make The Preview Fully Local

**Files:**
- Modify: `components/wechat-format-panel.test.tsx`
- Modify: `components/wechat-format-panel.tsx`

- [ ] Write failing tests proving ordinary Markdown renders without `DraftFormatting`, no paid button or theme selector exists, and copying uses rendered HTML plus original Markdown.
- [ ] Run `npx vitest run components/wechat-format-panel.test.tsx` and verify the old empty state fails.
- [ ] Reduce `WechatFormatPanel` props to `draftLabel`, `content`, scroll synchronization props, and render `renderExtendedMarkdown(content)` unconditionally.
- [ ] Remove the AI generation empty state, old `FormattingBlock[]` renderer, AI theme controls, and related imports.
- [ ] Re-run the focused test and verify it passes.

### Task 2: Make The Left Column A Live Markdown Editor

**Files:**
- Modify: `components/stages/draft-stage.test.tsx`
- Modify: `components/stages/draft-stage.tsx`

- [ ] Write failing tests proving the Markdown textarea is visible by default and editing it immediately updates the preview.
- [ ] Run `npx vitest run components/stages/draft-stage.test.tsx` and verify the current reading/edit-toggle UI fails.
- [ ] Remove edit-mode state and buttons; render a controlled Markdown textarea for the active draft.
- [ ] On change, update the selected draft through `handleUpdateDraft`, preserving scroll synchronization and version switching.
- [ ] Remove all formatting-specific props and request status handling from `DraftStage`.
- [ ] Re-run the focused test and verify it passes.

### Task 3: Remove Frontend Workflow And Persisted Formatting State

**Files:**
- Modify: `components/hooks/use-workflow.ts`
- Modify: `components/generation-pulse.tsx`
- Modify: `components/app-client.test.tsx`
- Modify: `lib/state-machine.ts`
- Modify: `lib/state-machine.test.ts`
- Modify: `lib/storage/workflow-storage.ts`
- Modify: `lib/storage/workflow-storage.test.ts`
- Modify: `types/workflow.ts`

- [ ] Update tests to remove `format_draft`, `draft_formatted`, theme-selection, and `draftFormattingByVersion` expectations while retaining draft editing and legacy-storage tolerance.
- [ ] Run the affected tests and verify failures identify the old workflow.
- [ ] Remove the `formatDraft` client call, handler, retry branch, progress action, formatting state/events/types, and new writes to storage.
- [ ] Keep loading old state tolerant by ignoring unknown legacy keys.
- [ ] Re-run affected tests and verify they pass.

### Task 4: Remove The AI Format API And Provider Surface

**Files:**
- Delete: `app/api/ai/format/stream/route.ts`
- Modify: `app/api/ai/ai-routes.test.ts`
- Modify: `lib/ai/client.ts`
- Modify: `lib/ai/client.test.ts`
- Modify: `lib/ai/service.ts`
- Modify: `lib/ai/service.test.ts`
- Modify: `lib/ai/provider.ts`
- Modify: `lib/ai/mock-provider.ts`
- Modify: `lib/ai/real-provider.ts`
- Modify: `lib/ai/real-provider.test.ts`
- Modify: `lib/ai/schemas.ts`
- Modify: `lib/ai/schemas.test.ts`
- Modify: `types/ai.ts`

- [ ] Update tests so the independent semantic-format endpoint and provider method no longer exist.
- [ ] Run the affected tests and verify failures identify remaining format surface.
- [ ] Delete `formatDraft()` client/service/provider methods, request/response schemas and types, and the route.
- [ ] Preserve `formatDraftMarkdown()` and its generation-time prompt/tests.
- [ ] Remove formatting-only imports and dead helpers if no other code references them.
- [ ] Re-run affected tests and verify they pass.

### Task 5: Verify The Complete Local Workflow

**Files:**
- Modify: `.planning/md2wechat-distillation/progress.md`
- Modify: `.planning/md2wechat-distillation/findings.md`

- [ ] Run focused component, workflow, storage, API, provider, Markdown, renderer, and copy tests.
- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check`.
- [ ] Open the local draft page when authentication permits; otherwise verify a production-rendered local fixture at desktop and 430px.
- [ ] Record that live preview and copy perform no AI request or credit consumption and that `formatDraftMarkdown()` remains active during draft generation.
