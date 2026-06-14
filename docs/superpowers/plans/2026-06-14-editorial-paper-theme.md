# Editorial Paper Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `editorial-paper` WeChat formatting theme beside `spring-fresh`, with free local theme switching and persisted per-draft selection.

**Architecture:** Keep `FormattingBlock[]` as the theme-independent semantic source. Extend the theme union and storage schema, route `renderWechatHtml` through two focused rendering strategies, and restore the existing state-machine theme event for local-only selection changes. The UI exposes two compact buttons and never calls the formatting API during a theme switch.

**Tech Stack:** Next.js 16, React 18, TypeScript, Zod, Vitest, Testing Library, inline WeChat-compatible HTML/CSS.

---

## File Map

- Modify `types/workflow.ts`: define the two supported themes and restore the theme-selection workflow event.
- Modify `lib/ai/schemas.ts`: validate both current themes and normalize three legacy IDs.
- Modify `lib/formatting/themes.ts`: add editorial-paper tokens without changing spring-fresh tokens.
- Modify `lib/formatting/render.ts`: select between spring card rendering and editorial continuous rendering.
- Modify `lib/state-machine.ts`: update only `selectedTheme` for the selected draft.
- Modify `components/hooks/use-workflow.ts`: expose the local theme-selection handler.
- Modify `components/wechat-format-panel.tsx`: render two theme controls and call the local handler.
- Modify `components/stages/draft-stage.tsx`: connect the theme handler to the panel.
- Modify existing colocated tests for rendering, schema/storage, state, panel, and AppClient behavior.

### Task 1: Theme Type And Persistence Contract

**Files:**
- Modify: `types/workflow.ts`
- Modify: `lib/ai/schemas.ts`
- Test: `lib/ai/schemas.test.ts`
- Test: `lib/storage/workflow-storage.test.ts`

- [ ] **Step 1: Write failing schema and storage tests**

Add assertions that `draftFormattingSchema` accepts `editorial-paper`, preserves `spring-fresh`, and maps each legacy theme to `spring-fresh`. Add a storage restore case whose saved theme is `editorial-paper` and expect it to remain unchanged.

```ts
expect(
  draftFormattingSchema.parse({
    draftVersionId: "draft-1",
    blocks: [{ id: "p1", type: "paragraph", text: "正文" }],
    selectedTheme: "editorial-paper",
    generatedAt: "2026-06-14T00:00:00.000Z",
  }).selectedTheme
).toBe("editorial-paper");
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
npx vitest run lib/ai/schemas.test.ts lib/storage/workflow-storage.test.ts
```

Expected: failure because `editorial-paper` is not accepted by the current theme type/schema.

- [ ] **Step 3: Extend the theme union and schema**

Use:

```ts
export const WECHAT_FORMAT_THEMES = [
  "spring-fresh",
  "editorial-paper",
] as const;
```

Update `draftFormattingSchema.selectedTheme` so preprocessing still maps legacy IDs to `spring-fresh`, while the final schema is `z.enum(["spring-fresh", "editorial-paper"])`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the Step 2 command. Expected: both files pass.

### Task 2: Editorial Paper Rendering Strategy

**Files:**
- Modify: `lib/formatting/themes.ts`
- Modify: `lib/formatting/render.ts`
- Test: `lib/formatting/render.test.ts`

- [ ] **Step 1: Write failing editorial rendering tests**

Render representative blocks with `editorial-paper` and assert:

```ts
expect(html).toContain('data-wechat-format="editorial-paper"');
expect(html).toContain("#f5f4ed");
expect(html).toContain('data-format-section="1"');
expect(html).toContain("border-top:1px solid");
expect(html).not.toContain("radial-gradient");
expect(html).not.toContain("❀");

const cta = html.match(/data-format-block="cta"[^]*?<\/section>/)?.[0] ?? "";
expect(cta).not.toContain("linear-gradient");
expect(cta).toContain("border-top:1px solid");
```

Retain the existing spring assertions so its card texture and flower heading remain protected.

- [ ] **Step 2: Run rendering tests and verify RED**

Run:

```bash
npx vitest run lib/formatting/render.test.ts
```

Expected: editorial tests fail because no tokens or rendering branch exists.

- [ ] **Step 3: Add editorial tokens**

Add an `editorial-paper` token record using warm paper `#f5f4ed`, warm ink, muted secondary text, one ink-green accent, hairline dividers, no card shadow, and no gradient CTA colors.

- [ ] **Step 4: Split theme-specific layout rendering**

Keep shared Markdown and semantic block helpers. Add focused functions with this contract:

```ts
function renderSpringFreshHtml(blocks: FormattingBlock[]): string;
function renderEditorialPaperHtml(blocks: FormattingBlock[]): string;
```

The editorial path groups headings into semantic sections but renders them as continuous content. Section 1 has no top rule; later sections use a 1px hairline and generous top padding. Heading, quote, pain, list, comparison, transition, and CTA styles use only the ink-green family.

- [ ] **Step 5: Run rendering tests and verify GREEN**

Run the Step 2 command. Expected: all render tests pass for both themes.

### Task 3: Local Theme Selection State

**Files:**
- Modify: `types/workflow.ts`
- Modify: `lib/state-machine.ts`
- Modify: `components/hooks/use-workflow.ts`
- Test: `lib/state-machine.test.ts`

- [ ] **Step 1: Write a failing state-machine test**

Start from stored `spring-fresh` blocks, dispatch:

```ts
{
  type: "format_theme_selected",
  draftVersionId: "draft-1",
  theme: "editorial-paper",
}
```

Assert the selected theme changes while `blocks` and `generatedAt` remain identical.

- [ ] **Step 2: Run the state test and verify RED**

Run:

```bash
npx vitest run lib/state-machine.test.ts
```

Expected: compile/test failure because the event was removed for the single-theme implementation.

- [ ] **Step 3: Restore the local-only event and handler**

Add the event to `WorkflowEvent`, restore the guarded reducer branch, and expose:

```ts
const handleSelectFormatTheme = (theme: WechatFormatTheme) => {
  if (!state.selectedDraftVersionId) return;
  updateState(transitionWorkflow(state, {
    type: "format_theme_selected",
    draftVersionId: state.selectedDraftVersionId,
    theme,
  }));
};
```

Do not call `formatDraft` or any credit API.

- [ ] **Step 4: Run the state test and verify GREEN**

Run the Step 2 command. Expected: state-machine tests pass.

### Task 4: Two-Theme Preview Controls

**Files:**
- Modify: `components/wechat-format-panel.tsx`
- Modify: `components/stages/draft-stage.tsx`
- Test: `components/wechat-format-panel.test.tsx`

- [ ] **Step 1: Write failing component tests**

Render formatting with `spring-fresh`, assert two buttons exist, then click “编辑纸感” and expect `onThemeChange("editorial-paper")`. Also assert selected state follows `formatting.selectedTheme`.

```ts
await user.click(screen.getByRole("button", { name: "编辑纸感" }));
expect(onThemeChange).toHaveBeenCalledWith("editorial-paper");
```

- [ ] **Step 2: Run the component test and verify RED**

Run:

```bash
npx vitest run components/wechat-format-panel.test.tsx
```

Expected: failure because the panel currently has no theme callback or buttons.

- [ ] **Step 3: Add compact theme controls**

Restore `onThemeChange` and render exactly two buttons: “春日清新” and “编辑纸感”. Use `aria-pressed` for selection, reset copy status when switching, and update empty-state copy to say theme switching and copying are free.

- [ ] **Step 4: Wire DraftStage**

Read `handleSelectFormatTheme` from workflow context and pass it to `WechatFormatPanel`.

- [ ] **Step 5: Run component tests and verify GREEN**

Run the Step 2 command. Expected: panel tests pass.

### Task 5: Prove Switching Does Not Re-request Or Charge

**Files:**
- Modify: `components/app-client.test.tsx`

- [ ] **Step 1: Write the failing AppClient behavior test**

Generate formatting once, click “编辑纸感”, and assert:

```ts
expect(fetchSpy).toHaveBeenCalledTimes(1);
expect(screen.getByLabelText("公众号排版预览")).toHaveAttribute(
  "data-theme",
  "editorial-paper"
);
```

- [ ] **Step 2: Run the AppClient test and verify RED**

Run:

```bash
npx vitest run components/app-client.test.tsx
```

Expected: failure because the theme control is not yet wired through the workflow context at the start of this task sequence.

- [ ] **Step 3: Make only integration corrections required by the test**

Correct context return values or prop wiring only. Do not add a network call, operation ID, progress event, or credit mutation for theme switching.

- [ ] **Step 4: Run the AppClient test and verify GREEN**

Run the Step 2 command. Expected: AppClient tests pass and the fetch count remains one.

### Task 6: Full Verification And Browser Review

**Files:**
- Review: all files changed by Tasks 1-5

- [ ] **Step 1: Run all automated checks**

```bash
npm test
npm run lint
npm run build
```

Expected: zero failed tests, lint exit 0, Next.js production build exit 0.

- [ ] **Step 2: Audit the diff**

Run:

```bash
git diff --check
git diff -- types/workflow.ts lib/ai/schemas.ts lib/formatting/themes.ts lib/formatting/render.ts lib/state-machine.ts components/hooks/use-workflow.ts components/wechat-format-panel.tsx components/stages/draft-stage.tsx
```

Confirm no AI classification, credit charging, or unrelated workflow logic changed.

- [ ] **Step 3: Verify in the local browser**

Open the existing draft preview, reload after the code change, and verify:

- both theme buttons are visible;
- switching updates the same preview immediately;
- editorial paper has continuous sections, warm paper, one green accent, no flower, no card texture, and no gradient CTA;
- switching back restores spring card styling;
- browser console has no errors.

- [ ] **Step 4: Report exact results**

Summarize changed behavior, verification counts, and any remaining visual caveat. Do not commit implementation unless the user asks.
