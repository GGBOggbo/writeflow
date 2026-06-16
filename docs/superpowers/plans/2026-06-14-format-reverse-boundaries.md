# Formatting Restraint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic restraint after AI semantic classification so WeChat previews keep useful variety without excessive quote, transition, or CTA blocks.

**Architecture:** Normalize only block types after integrity validation. Preserve block IDs, text, order, and count. Extend quality metrics for observability and keep rendering responsible only for presentation cleanup.

**Tech Stack:** TypeScript, Vitest, Next.js, Pino.

---

### Task 1: Deterministic classification restraint

**Files:**
- Modify: `lib/formatting/classification.ts`
- Modify: `lib/formatting/classification.test.ts`

- [x] Add failing tests for one CTA, first-screen restraint, quote/transition caps, even distribution, adjacent decorative blocks, and text/order preservation.
- [x] Run the focused tests and confirm they fail because normalization is missing.
- [x] Implement `normalizeFormattingBlocks()` with deterministic downgrade rules.
- [x] Run focused tests and confirm they pass.

### Task 2: Bidirectional quality metrics and service integration

**Files:**
- Modify: `lib/formatting/quality.ts`
- Modify: `lib/formatting/quality.test.ts`
- Modify: `lib/ai/service.ts`
- Modify: `lib/ai/service.test.ts`

- [x] Add failing tests for excessive quote/transition/CTA density and normalized service output.
- [x] Extend quality metrics with type counts, decorative ratio, and longest decorative run.
- [x] Normalize after integrity validation and log before/after distributions.
- [x] Run focused tests and confirm they pass.

### Task 3: Quote presentation cleanup

**Files:**
- Modify: `lib/formatting/render.ts`
- Modify: `lib/formatting/render.test.ts`

- [x] Add a failing test for outer Chinese/English quote-mark removal.
- [x] Implement render-only quote-wrapper cleanup.
- [x] Run focused renderer tests and confirm they pass.

### Task 4: Verification

- [x] Run focused formatting and service tests.
- [x] Run `npm test`.
- [x] Run `npm run lint && npm run build && git diff --check`.
- [x] Inspect the final diff and record that unrelated dirty worktree changes were preserved.
