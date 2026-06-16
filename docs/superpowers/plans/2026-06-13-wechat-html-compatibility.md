# WeChat HTML Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize rendered article HTML immediately before rich-text copying so pasted content remains stable in the WeChat editor.

**Architecture:** Keep `ArticleBlock[]` and `renderWechatHtml()` as the canonical content and theme layers. Add a deterministic DOM-based export normalizer that removes internal attributes, reinforces inline typography, repairs list markup, keeps Chinese punctuation with adjacent emphasis, and converts image flex rows to table markup; call it only at the rich-copy boundary.

**Tech Stack:** TypeScript, browser DOM APIs, Vitest, jsdom

---

### Task 1: Export normalizer

**Files:**
- Create: `lib/formatting/wechat-compat.ts`
- Create: `lib/formatting/wechat-compat.test.ts`

- [x] **Step 1: Write failing tests for export cleanup**

Test that normalization removes internal `data-*` and `class` attributes while retaining the root `<section>` and inline styles.

- [x] **Step 2: Run the focused test and verify RED**

Run: `npx vitest run lib/formatting/wechat-compat.test.ts`

Expected: FAIL because `normalizeWechatHtml` does not exist.

- [x] **Step 3: Implement minimal DOM normalization**

Export `normalizeWechatHtml(html: string): string`. Parse into a detached document, find the rendered root, remove internal attributes/classes, and return `outerHTML` without executing or fetching external content.

- [x] **Step 4: Add compatibility tests one behavior at a time**

Cover typography inheritance on `p/li/blockquote/span`, nested `<p>` flattening inside list items, Chinese punctuation attachment to adjacent emphasis, and image-only flex rows converted to table cells.

- [x] **Step 5: Implement each compatibility rule and keep focused tests green**

Use DOM operations rather than regular expressions for structural rewrites. Preserve existing inline styles and only append missing typography properties.

### Task 2: Rich-copy integration

**Files:**
- Modify: `lib/copy/copy-rich-html.ts`
- Modify: `lib/copy/copy-rich-html.test.ts`

- [x] **Step 1: Write a failing clipboard payload test**

Pass HTML containing internal attributes to `copyRichHtml()` and assert the `text/html` clipboard blob contains normalized export HTML.

- [x] **Step 2: Run the focused test and verify RED**

Run: `npx vitest run lib/copy/copy-rich-html.test.ts`

Expected: FAIL because the raw HTML is currently copied unchanged.

- [x] **Step 3: Normalize once at the copy boundary**

Call `normalizeWechatHtml(html)` before both the modern Clipboard API path and the `execCommand` fallback. Keep plain text unchanged.

- [x] **Step 4: Run both focused suites**

Run: `npx vitest run lib/formatting/wechat-compat.test.ts lib/copy/copy-rich-html.test.ts`

Expected: PASS.

### Task 3: Verification

**Files:**
- No production file changes expected.

- [x] **Step 1: Run the full test suite**

Run: `npm test`

Expected: all tests pass.

- [x] **Step 2: Run static checks and production build**

Run: `npm run lint && npm run build && git diff --check`

Expected: all commands exit successfully with no whitespace errors.
