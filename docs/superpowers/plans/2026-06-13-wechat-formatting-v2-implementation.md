# WeChat Formatting V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reject collapsed long-form semantic classifications, retry them once inside the same billed operation, and render approved blocks with a magazine-quality visual system.

**Architecture:** A pure quality analyzer scores semantic block diversity without touching text. The AI service validates integrity and quality after each provider call, passes structured feedback into a single retry, and throws after the second low-quality result so the existing stream route refunds the reserved credit. The deterministic renderer keeps the same public API while replacing flat block styling with theme-specific editorial treatments.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zod, Vitest, existing DeepSeek-compatible provider and credit stream infrastructure.

---

### Task 1: Semantic quality analyzer

**Files:**
- Create: `lib/formatting/quality.ts`
- Create: `lib/formatting/quality.test.ts`

- [ ] Write failing tests for short-text tolerance, the real 98/100 paragraph collapse, sufficient long-form diversity, and longest paragraph run.
- [ ] Run `npm test -- lib/formatting/quality.test.ts` and confirm failure because the analyzer does not exist.
- [ ] Implement `analyzeFormattingQuality()` and `assertFormattingQuality()` as pure functions.
- [ ] Run the focused test until green.

### Task 2: One quality retry within the same credit operation

**Files:**
- Modify: `lib/ai/provider.ts`
- Modify: `lib/ai/prompts/format-draft.ts`
- Modify: `lib/ai/prompts/format-draft.test.ts`
- Modify: `lib/ai/real-provider.ts`
- Modify: `lib/ai/mock-provider.ts`
- Modify: `lib/ai/service.ts`
- Modify: `lib/ai/service.test.ts`

- [ ] Write failing service tests proving a collapsed first result retries once, a good second result succeeds, and two collapsed results throw.
- [ ] Write a failing prompt test proving retry feedback is included without weakening the no-rewrite boundary.
- [ ] Run the focused tests and confirm red.
- [ ] Add optional provider formatting feedback, quality logs, one service-level retry, and final quality assertion.
- [ ] Run focused tests until green.

### Task 3: Editorial theme renderer

**Files:**
- Modify: `lib/formatting/themes.ts`
- Modify: `lib/formatting/render.ts`
- Modify: `lib/formatting/render.test.ts`
- Modify: `components/wechat-format-panel.tsx`
- Modify: `components/wechat-format-panel.test.tsx`

- [ ] Extend renderer tests with visual contracts for editorial labels, dark quote treatments, distinct pain blocks, restrained transitions, and warm CTA endings.
- [ ] Run renderer and panel tests and confirm red.
- [ ] Implement theme-specific editorial tokens and block treatments while preserving inline-only output.
- [ ] Refine the preview shell so the article, not the phone chrome, dominates the panel.
- [ ] Run focused tests until green.

### Task 4: Integration and real-browser verification

**Files:**
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check`.
- [ ] Reload the existing Chrome workbench, regenerate formatting for the real long draft, and inspect semantic diversity and preview appearance.
- [ ] Review the final diff without staging unrelated auth/database work.
