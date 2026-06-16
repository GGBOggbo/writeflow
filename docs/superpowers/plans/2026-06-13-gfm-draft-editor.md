# GFM Draft Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate, render, edit, save, and format draft content as safe GFM Markdown without exposing source markers in reading or WeChat preview modes.

**Architecture:** Introduce one deterministic Markdown-to-safe-HTML module shared by the draft reader and WeChat renderer. Keep Markdown as the canonical `DraftVersion.content`, update it through a workflow event, and invalidate only the edited draft's prior formatting.

**Tech Stack:** React 19, Next.js 16, TypeScript, Marked, sanitize-html, Vitest, Testing Library

---

### Task 1: Safe GFM rendering core

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `lib/markdown/render.ts`
- Create: `lib/markdown/render.test.ts`

- [x] Write failing tests covering headings, emphasis, strike, quote, ordered/unordered/task lists, links, images, horizontal rules, tables, inline code, fenced code, raw HTML removal, and unsafe URL removal.
- [x] Run the focused test and confirm failure because the renderer does not exist.
- [x] Install `marked` and `sanitize-html` with TypeScript types if required.
- [x] Implement `renderSafeGfm(markdown)` with a strict tag/attribute/scheme allowlist and safe external-link attributes.
- [x] Run the focused test and confirm all cases pass.

### Task 2: Draft update state transition

**Files:**
- Modify: `types/workflow.ts`
- Modify: `lib/state-machine.ts`
- Modify: `lib/state-machine.test.ts`
- Modify: `components/hooks/use-workflow.ts`

- [x] Add a failing state-machine test that updates one draft and removes only that draft's cached formatting.
- [x] Add `draft_updated` to `WorkflowEvent` and implement the transition.
- [x] Expose `handleUpdateDraft(draftVersionId, content)` from `useWorkflow`.
- [x] Run state-machine tests and confirm they pass.

### Task 3: Typora-style reader/editor

**Files:**
- Create: `components/markdown-article.tsx`
- Create: `components/markdown-article.test.tsx`
- Modify: `components/stages/draft-stage.tsx`
- Modify: `components/stages/draft-stage.test.tsx`

- [x] Write failing component tests for rendered reading mode, source edit mode, save, cancel, empty-content validation, and switching drafts while editing.
- [x] Implement the safe rendered article component and local edit buffer.
- [x] Save through `handleUpdateDraft`; cancel without changing workflow state.
- [x] Run focused component tests and confirm they pass.

### Task 4: AI and WeChat Markdown awareness

**Files:**
- Modify: `lib/ai/prompts/policies.ts`
- Modify: `lib/ai/prompts/draft.ts`
- Modify: `lib/ai/prompts/draft.test.ts`
- Modify: `lib/ai/prompts/humanize-draft.ts`
- Create: `lib/ai/prompts/humanize-draft.test.ts`
- Modify: `lib/formatting/render.ts`
- Modify: `lib/formatting/render.test.ts`

- [x] Write failing prompt tests requiring GFM draft output and preservation during humanization.
- [x] Write failing renderer tests proving Markdown markers are parsed and GFM structures appear in WeChat HTML.
- [x] Update prompts without changing the JSON schema.
- [x] Integrate safe GFM parsing into semantic block rendering while retaining existing theme wrappers.
- [x] Run all focused prompt and formatting tests.

### Task 5: Full verification

**Files:**
- No additional production files expected.

- [x] Run `npm test`.
- [x] Run `npm run lint && npm run build && git diff --check`.
- [x] Inspect the final diff to confirm no database, credit, provider, or unrelated workflow behavior changed.
