# WeChat Semantic Formatting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a separately metered semantic formatting tool that preserves draft text, renders three stable inline-style themes, previews the result, and copies rich HTML for WeChat.

**Architecture:** The AI provider returns ordered semantic blocks only. The service validates that concatenated block text exactly matches the normalized source draft, then workflow state stores the blocks by draft version. A deterministic renderer converts blocks and a selected theme to safe inline HTML; theme switching is local and free.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zod, Vitest, Testing Library, existing NDJSON streaming and credit operation infrastructure.

---

### Task 1: Semantic formatting domain and prompt

**Files:**
- Modify: `types/workflow.ts`
- Modify: `types/ai.ts`
- Modify: `lib/ai/schemas.ts`
- Create: `lib/ai/prompts/format-draft.ts`
- Create: `lib/ai/prompts/format-draft.test.ts`
- Create: `lib/formatting/integrity.ts`
- Create: `lib/formatting/integrity.test.ts`

- [ ] Write failing tests for allowed block types, prompt boundaries, and exact normalized-text preservation.
- [ ] Run the focused tests and confirm failures are caused by missing formatting contracts.
- [ ] Add `FormattingBlock`, `DraftFormatting`, request/response schemas, a prompt that forbids rewriting/HTML/CSS, and integrity validation.
- [ ] Run focused tests until green.

### Task 2: Provider, service, client, progress, and metered route

**Files:**
- Modify: `lib/ai/provider.ts`
- Modify: `lib/ai/real-provider.ts`
- Modify: `lib/ai/mock-provider.ts`
- Modify: `lib/ai/service.ts`
- Modify: `lib/ai/client.ts`
- Modify: `lib/progress/types.ts`
- Modify: `lib/credits-core.ts`
- Create: `app/api/ai/format/stream/route.ts`
- Modify tests near each module.

- [ ] Write failing tests proving format uses the business model, returns validated blocks, emits progress, and is billed under stage `format`.
- [ ] Run focused tests and confirm red.
- [ ] Add provider method, service function, client function, progress events, credit stage, and stream route.
- [ ] Run focused tests until green.

### Task 3: Deterministic WeChat renderer

**Files:**
- Create: `lib/formatting/themes.ts`
- Create: `lib/formatting/render.ts`
- Create: `lib/formatting/render.test.ts`

- [ ] Write failing tests for professional-blue, warm-orange, and fresh-teal output.
- [ ] Assert output contains inline styles, escaped text, semantic containers, and no style/script/external CSS.
- [ ] Implement theme tokens and deterministic block rendering with a 640px single-column root.
- [ ] Run renderer tests until green.

### Task 4: Workflow state, persistence, and retry

**Files:**
- Modify: `types/workflow.ts`
- Modify: `lib/state-machine.ts`
- Modify: `lib/state-machine.test.ts`
- Modify: `lib/storage/workflow-storage.ts`
- Modify: `lib/storage/workflow-storage.test.ts`
- Modify: `components/hooks/use-workflow.ts`
- Modify: `components/app-client.test.tsx`

- [ ] Write failing tests for storing formatting by draft ID, selecting a theme without AI, resetting stale formatting after draft regeneration, persistence recovery, billing, and retry.
- [ ] Run focused tests and confirm red.
- [ ] Add workflow events and handlers for format generation/theme selection while preserving the existing meta flow.
- [ ] Run focused tests until green.

### Task 5: Draft-stage formatting UI and rich copy

**Files:**
- Create: `components/wechat-format-panel.tsx`
- Create: `components/wechat-format-panel.test.tsx`
- Modify: `components/stages/draft-stage.tsx`
- Create or modify rich-copy helper under `lib/copy/`.

- [ ] Write failing UI tests for the paid button, three themes, phone preview, selected draft binding, and copy fallback.
- [ ] Run focused tests and confirm red.
- [ ] Implement the panel, iframe/srcDoc preview or isolated preview container, and rich clipboard copy with graceful fallback.
- [ ] Run UI tests until green.

### Task 6: Integration verification

**Files:**
- Modify documentation only if implementation details differ from the approved design.

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check`.
- [ ] Open the local app in the in-app browser and verify draft selection, formatting generation, theme switching, and preview rendering.
- [ ] Review the final diff to ensure unrelated SQLite/auth/database changes were not staged or altered.
