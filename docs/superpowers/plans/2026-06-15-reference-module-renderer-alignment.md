# Reference Module Renderer Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate oversized/misclassified CTA blocks and align the local 31-module renderer with the archived warm-paper Markdown-to-HTML reference while keeping one preview/copy rendering source.

**Architecture:** Keep `MODULE_DEFS` and `parseAdvancedMarkdown()` as the syntax truth. Add semantic content validation and deterministic Markdown degradation before rendering, tighten AI/local CTA selection, then replace the green token set and module templates with warm-paper reference contracts. `renderExtendedMarkdown()` remains the only preview renderer; `normalizeWechatHtml()` only flattens unsupported WeChat layouts.

**Tech Stack:** TypeScript, React 19, Next.js 16.2.7, Vitest, Testing Library, Pino, inline WeChat-safe HTML/CSS.

---

## File Map

- Modify `lib/markdown/module-defs.ts`: add field content limits and cross-field constraints to the module truth source.
- Modify `lib/markdown/advanced-modules.ts`: validate CTA/verdict semantic constraints and expose safe module-to-Markdown degradation.
- Modify `lib/markdown/advanced-modules.test.ts`: contract and degradation tests.
- Modify `lib/ai/prompts/markdown-draft.ts`: distinguish CTA, verdict, and ordinary argument paragraphs.
- Modify `lib/ai/prompts/markdown-draft.test.ts`: prompt boundary assertions.
- Modify `lib/ai/draft-module-layout.ts`: remove broad CTA matching, only select true end actions, never duplicate title into note, report degradation stats.
- Modify `lib/ai/draft-module-layout.test.ts`: reproduce the Claude Code paragraph misclassification and duplicate-field bug.
- Modify `lib/formatting/wechat-native-tokens.ts`: replace green tokens with archived warm-paper tokens.
- Modify `lib/formatting/advanced-module-render.ts`: align CTA/verdict first, then the remaining module families.
- Modify `lib/formatting/advanced-module-render.test.ts`: reference-DOM structural assertions for all families.
- Modify `lib/formatting/render-extended-markdown.ts`: degrade semantically invalid modules without losing text.
- Modify `lib/formatting/render-extended-markdown.test.ts`: invalid module degradation and full fixture rendering tests.
- Modify `lib/formatting/wechat-compat.ts`: flatten CTA action grids during copy.
- Modify `lib/formatting/wechat-compat.test.ts`: CTA copy degradation tests.
- Modify `lib/ai/service.ts` and `lib/ai/service.test.ts`: structured completion logs for module/degradation counts.
- Use `docs/audits/fixtures/md2wechat-wechat-native/full-module-source.md` and `full-module-rendered.html` as test evidence, not runtime dependencies.

### Task 1: Tighten CTA And Verdict Contracts

**Files:**
- Modify: `lib/markdown/module-defs.ts`
- Modify: `lib/markdown/advanced-modules.ts`
- Test: `lib/markdown/advanced-modules.test.ts`

- [ ] **Step 1: Write failing semantic-contract tests**

Add tests proving:

```ts
expect(validateAdvancedModuleContracts(`:::cta
title: 这一步卡住的随机性在哪？卡在结构上。AI 直接写代码最大的问题是边写边改，后面发现设计不对又回头改。
note: 这一步卡住的随机性在哪？卡在结构上。AI 直接写代码最大的问题是边写边改，后面发现设计不对又回头改。
:::`)).toMatchObject({
  ok: false,
  module: "cta",
});
```

Also assert that a short CTA and a concise verdict still validate.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx vitest run lib/markdown/advanced-modules.test.ts
```

Expected: FAIL because existing validation checks field names only.

- [ ] **Step 3: Add constraints to the module truth source**

Extend field definitions with optional constraints:

```ts
constraints: {
  maxChars?: Record<string, number>;
  distinctFields?: readonly (readonly [string, string])[];
}
```

Set:

```ts
cta: {
  maxChars: { title: 52, note: 80 },
  distinctFields: [["title", "note"]],
}
verdict: {
  maxChars: { title: 48, body: 180 },
}
```

Use normalized punctuation/whitespace comparison for distinct fields.

- [ ] **Step 4: Implement safe degradation text**

Export:

```ts
export function advancedModuleToMarkdown(node: AdvancedModuleNode): string
```

For field modules, return non-empty unique field values as paragraphs; for row modules, return title plus readable list rows; for image/dialogue modules, preserve their Markdown body. Do not truncate content.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
npx vitest run lib/markdown/advanced-modules.test.ts
```

Expected: PASS.

### Task 2: Stop Misclassifying Ordinary Arguments As CTA

**Files:**
- Modify: `lib/ai/prompts/markdown-draft.ts`
- Modify: `lib/ai/prompts/markdown-draft.test.ts`
- Modify: `lib/ai/draft-module-layout.ts`
- Modify: `lib/ai/draft-module-layout.test.ts`

- [ ] **Step 1: Write failing regression tests**

Add the real failure shape:

```ts
const structuralArgument =
  "这一步卡住的随机性在哪？卡在结构上。AI 直接写代码最大的问题是边写边改，写到后面发现前面的设计不对，又回头改。";
```

Assert it remains a paragraph or becomes `verdict`, never `cta`.

Add a separate real action ending:

```ts
"如果你也卡在这里，先把主流程完整跑一遍。"
```

Assert it becomes:

```md
:::cta
title: 先把主流程完整跑一遍
:::
```

and does not contain a duplicate `note`.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
npx vitest run lib/ai/draft-module-layout.test.ts lib/ai/prompts/markdown-draft.test.ts
```

Expected: the structural paragraph is classified as CTA or the CTA repeats note text.

- [ ] **Step 3: Tighten prompt rules**

Add explicit rules:

```text
cta 只能使用文章最后两个自然段中的明确行动句。
解释“为什么、问题在哪、结构是什么”的论述不是 CTA。
cta.title 必须是短行动句；不要把同一段复制到 note。
没有明确下一步时保留普通段落，不要生成 CTA。
```

- [ ] **Step 4: Tighten deterministic selection**

Change local CTA selection to:

- inspect only the final two eligible paragraphs;
- require an imperative/action pattern near the paragraph beginning or ending;
- reject question/explanation patterns such as `问题是`、`卡在`、`原因`、`为什么`;
- reject paragraphs longer than the CTA title limit;
- generate no `note` unless a distinct short note exists in source.

Keep verdict selection independent.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
npx vitest run lib/ai/draft-module-layout.test.ts lib/ai/prompts/markdown-draft.test.ts
```

Expected: PASS.

### Task 3: Degrade Invalid Modules Before Rendering

**Files:**
- Modify: `lib/formatting/render-extended-markdown.ts`
- Modify: `lib/formatting/render-extended-markdown.test.ts`

- [ ] **Step 1: Write failing rendering tests**

Assert an oversized duplicate CTA:

- does not produce `data-mpa-action-id="cta"`;
- preserves the full argument text once;
- does not expose raw `:::` syntax.

Assert a valid short CTA still renders as CTA.

- [ ] **Step 2: Run test and verify RED**

Run:

```bash
npx vitest run lib/formatting/render-extended-markdown.test.ts
```

Expected: invalid CTA currently renders as a large CTA.

- [ ] **Step 3: Validate every parsed module before rendering**

In `renderExtendedMarkdown()`:

```ts
const validation = validateAdvancedModuleNode(node);
return validation.ok
  ? renderAdvancedModule(node)
  : renderMarkdownNode(advancedModuleToMarkdown(node));
```

This keeps all content while removing malformed presentation.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
npx vitest run lib/formatting/render-extended-markdown.test.ts
```

Expected: PASS.

### Task 4: Align Warm-Paper Tokens, CTA, And Verdict

**Files:**
- Modify: `lib/formatting/wechat-native-tokens.ts`
- Modify: `lib/formatting/advanced-module-render.ts`
- Modify: `lib/formatting/advanced-module-render.test.ts`

- [ ] **Step 1: Write failing reference-structure tests**

For CTA assert:

```ts
expect(html).toContain("保存灵感");
expect(html).toContain("直接套用");
expect(html).toContain("继续体验");
expect(html).toContain("grid-template-columns:repeat(2,minmax(0,1fr))");
expect(html).toContain("#ead6cc");
expect(html).not.toContain("#1f5f46");
```

For verdict assert the marker, warm gradient, eyebrow/title/body hierarchy, and compact padding.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
npx vitest run lib/formatting/advanced-module-render.test.ts
```

Expected: FAIL against current green card renderer.

- [ ] **Step 3: Replace centralized visual tokens**

Use the archived palette:

```ts
text: "#555555"
muted: "#737373"
accent: "#b3593b"
accentStrong: "#9f482f"
accentSoft: "#ead6cc"
accentPale: "#faf9f5"
surface: "#f7f7f7"
border: "#dab1a1"
```

Use a `16px` principal radius and the archived low, neutral shadow.

- [ ] **Step 4: Implement reference CTA**

Render:

- short title;
- three fixed action cards and inline SVG icons;
- optional note footer;
- warm gradient shell;
- two-column grid in preview.

- [ ] **Step 5: Implement reference verdict**

Render:

- accent marker and optional `eyebrow || "最终判断"`;
- 17px strong title;
- 15px body;
- compact warm gradient card.

- [ ] **Step 6: Run tests and verify GREEN**

Run:

```bash
npx vitest run lib/formatting/advanced-module-render.test.ts
```

Expected: PASS.

### Task 5: Align The Remaining Module Families

**Files:**
- Modify: `lib/formatting/advanced-module-render.ts`
- Modify: `lib/formatting/advanced-module-render.test.ts`
- Test fixture: `docs/audits/fixtures/md2wechat-wechat-native/full-module-rendered.html`

- [ ] **Step 1: Add family-level failing assertions**

Cover these families separately:

1. Entry/section: `hero`, `part`, `label-title`, `toc`.
2. Evidence/grid: `cards`, `metrics`, `people`, `cases`, `pricing`, `logos`.
3. Judgment/text: `infographic`, `audience-fit`, `quote`, `summary`, `notice`, `faq`.
4. Image: `image-text`, `image-compare`, `image-annotate`, `image-steps`, `gallery`, `longimage`.
5. Utility/end: `checklist`, `toolbox`, `specs`, `dialogue`, `author-card`, `series`, `subscribe`.

Assert each family’s distinct DOM shape and warm-paper tokens; do not use one full-file string snapshot.

- [ ] **Step 2: Verify RED**

Run:

```bash
npx vitest run lib/formatting/advanced-module-render.test.ts
```

Expected: family assertions fail against generic stacked cards.

- [ ] **Step 3: Port reference skeletons family by family**

Use the archived HTML only to derive observable structure, inline styles, spacing, and hierarchy. Keep existing URL sanitization and escaping helpers. Preserve unique module behavior such as gallery scrolling and long-image viewport.

- [ ] **Step 4: Verify all renderer tests**

Run:

```bash
npx vitest run lib/formatting/advanced-module-render.test.ts lib/formatting/render-extended-markdown.test.ts
```

Expected: PASS with all 31 module names rendered.

### Task 6: Keep Copy Output On The Same Renderer

**Files:**
- Modify: `lib/formatting/wechat-compat.ts`
- Modify: `lib/formatting/wechat-compat.test.ts`
- Modify: `components/wechat-format-panel.test.tsx`

- [ ] **Step 1: Write failing CTA copy test**

Render a valid CTA, pass it to `normalizeWechatHtml()`, and assert:

- all three action labels remain;
- grid/flex properties are absent;
- the action cards become full-width stacked sections;
- warm colors and text hierarchy remain.

- [ ] **Step 2: Verify RED**

Run:

```bash
npx vitest run lib/formatting/wechat-compat.test.ts components/wechat-format-panel.test.tsx
```

Expected: CTA is not currently included in advanced layout stacking.

- [ ] **Step 3: Add CTA to deterministic layout degradation**

Include `cta` in the compatibility stack list and scope stacking to the action-grid child, not the entire CTA shell.

- [ ] **Step 4: Verify GREEN**

Run the same focused tests and expect PASS.

### Task 7: Add Module Outcome Logging

**Files:**
- Modify: `lib/ai/draft-module-layout.ts`
- Modify: `lib/ai/service.ts`
- Modify: `lib/ai/service.test.ts`

- [ ] **Step 1: Write failing service-log assertion**

Assert completion logs include:

```ts
{
  moduleCount: expect.any(Number),
  moduleNames: expect.any(Array),
  ctaCount: expect.any(Number),
  degradedModules: expect.any(Number),
  degradationReasons: expect.any(Array),
}
```

and do not include full content.

- [ ] **Step 2: Verify RED**

Run:

```bash
npx vitest run lib/ai/service.test.ts
```

- [ ] **Step 3: Carry diagnostics through the result**

Extend `DraftModuleLayoutResult` with aggregate diagnostics only. Log stable reason codes such as `cta_too_long`, `duplicate_fields`, and `cta_not_action`.

- [ ] **Step 4: Verify GREEN**

Run the focused service test and expect PASS.

### Task 8: Full Verification And Browser Regression

**Files:**
- Update: `.planning/md2wechat-distillation/findings.md`
- Update: `.planning/md2wechat-distillation/progress.md`

- [ ] **Step 1: Run focused formatting suite**

```bash
npx vitest run \
  lib/markdown/advanced-modules.test.ts \
  lib/ai/prompts/markdown-draft.test.ts \
  lib/ai/draft-module-layout.test.ts \
  lib/formatting/advanced-module-render.test.ts \
  lib/formatting/render-extended-markdown.test.ts \
  lib/formatting/wechat-compat.test.ts \
  components/wechat-format-panel.test.tsx \
  lib/ai/service.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 2: Run repository verification**

```bash
npm test
npm run lint
npm run build
git diff --check
```

Expected: zero failures.

- [ ] **Step 3: Verify current Claude Code draft in Chrome**

Confirm:

- the structural argument is no longer a CTA;
- no CTA repeats the same text in title/note;
- verdict is compact and warm-paper styled;
- preview width remains 411px without horizontal overflow.

- [ ] **Step 4: Verify the complete module fixture**

Load the complete 411-line fixture and confirm all 31 module names appear, CTA uses three action cards, longimage/gallery keep preview behavior, and no broken images or horizontal overflow appear.

- [ ] **Step 5: Record evidence**

Write exact test counts, build status, browser dimensions, CTA/verdict dimensions, and remaining visual gaps to planning files.

## Execution Note

This plan must run in the current working tree because the formatting pipeline it changes is still part of the user’s uncommitted WIP. A clean worktree would omit those dependent files. Do not stage or revert unrelated database, auth, search, credit, or UI changes. Stage files explicitly per task if commits are requested.
