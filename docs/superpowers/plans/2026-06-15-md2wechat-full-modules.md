# md2wechat Full Modules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Parse and locally render all 31 advanced md2wechat modules from Markdown, preserve current GFM and AI formatting behavior, and export WeChat-safe HTML without runtime CLI/API dependencies.

**Architecture:** Add a standalone extended-Markdown layer that splits ordinary Markdown and fenced `:::` modules into typed `ArticleNode` values. Render the nodes through a `wechat-native` module registry with shared field/row/image/brand helpers, then apply the existing WeChat compatibility normalizer. The preview uses source Markdown when advanced modules are present and falls back to the existing `FormattingBlock[]` renderer for legacy drafts.

**Tech Stack:** TypeScript, Zod, Marked, sanitize-html, Vitest, React 19, Next.js 16.

---

### Task 1: Module Registry And Parser

**Files:**
- Create: `lib/markdown/advanced-modules.ts`
- Create: `lib/markdown/advanced-modules.test.ts`

- [ ] Write failing tests for parsing bracket titles, field bodies, row bodies, pipe-delimited values, unknown modules, unclosed fences, and all 31 supported names.
- [ ] Run `npx vitest run lib/markdown/advanced-modules.test.ts` and verify failures are caused by the missing parser.
- [ ] Define the supported module name tuple and typed `ArticleNode` structures.
- [ ] Implement a line-oriented parser that emits alternating `markdown` and `module` nodes without altering source text.
- [ ] Validate module fields/rows with registry metadata and return a visible fallback node for malformed input.
- [ ] Re-run the focused test and verify it passes.

### Task 2: Base Markdown Extensions

**Files:**
- Modify: `lib/markdown/render.ts`
- Modify: `lib/markdown/render.test.ts`

- [ ] Write failing tests for NOTE/TIP/IMPORTANT/WARNING/CAUTION blocks and footnote references/definitions.
- [ ] Run `npx vitest run lib/markdown/render.test.ts` and verify current plain-blockquote/incorrect-link behavior fails the assertions.
- [ ] Add deterministic preprocessing for GFM alerts and footnotes before sanitization.
- [ ] Extend safe tags/attributes only as needed for local alert icons, footnote IDs, and back-links.
- [ ] Verify existing unsafe HTML and URL sanitization tests remain green.

### Task 3: Theme Tokens And Shared Module Renderer

**Files:**
- Create: `lib/formatting/wechat-native-tokens.ts`
- Create: `lib/formatting/advanced-module-render.ts`
- Create: `lib/formatting/advanced-module-render.test.ts`

- [ ] Write failing structural tests for every module name, checking its `data-mpa-action-id`, key text, images/links, and required visual contract.
- [ ] Run the focused renderer test and verify all module cases fail before implementation.
- [ ] Add centralized `wechat-native` colors, typography, spacing, borders, radii, and shadows.
- [ ] Implement shared safe helpers for pills, cards, rows, images, links, highlighted title fragments, and list values.
- [ ] Implement all field-based modules: hero, infographic, audience-fit, verdict, part, label-title, quote, image-text, image-compare, image-annotate, summary, author-card, series, subscribe, cta.
- [ ] Implement all row-based modules: cards, metrics, people, cases, pricing, faq, logos, toc, checklist, toolbox, specs, image-steps, notice.
- [ ] Implement gallery, longimage, and dialogue renderers.
- [ ] Re-run focused tests and verify all 31 modules pass.

### Task 4: Full Article Rendering

**Files:**
- Create: `lib/formatting/render-extended-markdown.ts`
- Create: `lib/formatting/render-extended-markdown.test.ts`
- Add fixture: `lib/formatting/fixtures/md2wechat-all-modules.md`

- [ ] Write a failing end-to-end test that renders a compact fixture containing all 31 modules and asserts the complete module-ID set.
- [ ] Write failing tests that ordinary Markdown remains in original order around modules and malformed modules remain visibly editable.
- [ ] Implement `renderExtendedMarkdown(markdown)` by composing the parser, safe GFM renderer, and advanced module renderer.
- [ ] Verify the resulting HTML has one theme root, no raw `:::` markers for valid modules, and no executable markup.

### Task 5: WeChat Export Degradation

**Files:**
- Modify: `lib/formatting/wechat-compat.ts`
- Modify: `lib/formatting/wechat-compat.test.ts`

- [ ] Write failing tests for multi-column module degradation, image comparison stacking, static gallery export, long-image flattening, and removal of module-only classes/data attributes.
- [ ] Run the focused compatibility test and verify the new cases fail.
- [ ] Convert grid/flex card groups to stable tables or vertical sections before stripping editor metadata.
- [ ] Convert gallery and longimage containers into ordinary image sequences for copied HTML.
- [ ] Preserve dialogue identity, FAQ answers, links, images, footnotes, and visible text after normalization.
- [ ] Re-run focused compatibility tests.

### Task 6: Preview Integration And Legacy Fallback

**Files:**
- Modify: `components/wechat-format-panel.tsx`
- Modify: `components/wechat-format-panel.test.tsx`
- Modify: `components/stages/draft-stage.tsx`
- Modify: `components/stages/draft-stage.test.tsx`

- [ ] Write failing tests that the panel receives source Markdown, renders advanced modules when present, and keeps the old `FormattingBlock[]` renderer for ordinary legacy content.
- [ ] Add a `content` prop to `WechatFormatPanel` and pass the selected draft content from `DraftStage`.
- [ ] Select extended rendering only when the parser finds a valid advanced module; otherwise retain current theme switching and AI formatting output.
- [ ] Ensure copy uses the extended HTML and original Markdown plain text.
- [ ] Verify scroll synchronization and device preview behavior remain intact.

### Task 7: AI Markdown And Material Completion Boundaries

**Files:**
- Modify: `lib/ai/prompts/markdown-draft.ts`
- Modify: `lib/ai/prompts/markdown-draft.test.ts`
- Modify: `lib/ai/prompts/complete-materials.ts`
- Modify: `lib/ai/prompts/complete-materials.test.ts`
- Modify: `lib/ai/markdown-post-processing.ts`
- Modify: `lib/ai/markdown-post-processing.test.ts`

- [ ] Write failing prompt tests requiring only supported module names, 3–6 advanced modules by default, and factual-source requirements for metrics/pricing/cases/logos/people/author data.
- [ ] Add preservation tests ensuring post-processing and material completion do not delete or corrupt `:::` fences and field lines.
- [ ] Update Markdown formatting instructions with the module catalog and sparse-use rules.
- [ ] Keep material completion limited to placeholders while preserving advanced module syntax.
- [ ] Verify validation degrades safely to the original draft if module integrity changes.

### Task 8: Full Fixture And Browser Verification

**Files:**
- Modify if needed: `docs/audits/2026-06-15-md2wechat-wechat-native-audit.md`
- Modify: `.planning/md2wechat-distillation/task_plan.md`
- Modify: `.planning/md2wechat-distillation/findings.md`
- Modify: `.planning/md2wechat-distillation/progress.md`

- [ ] Run focused tests for parser, Markdown, modules, extended rendering, compatibility, panel, and AI prompts.
- [ ] Run `npm test`, `npm run lint`, `npm run build`, and `git diff --check`.
- [ ] Open the local draft page in the in-app browser and verify the complete fixture at desktop and 430px viewport.
- [ ] Verify copied HTML contains no scripts, editor classes, or `data-*` markers and remains readable.
- [ ] Record final supported module count, verification results, and any residual WeChat-editor risk.

