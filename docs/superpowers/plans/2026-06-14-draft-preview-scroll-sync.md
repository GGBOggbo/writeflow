# Draft Preview Scroll Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fixed-height desktop writing workspace where the draft and WeChat preview scroll independently and can synchronize their reading progress in both directions.

**Architecture:** Add a small DOM-agnostic scroll ratio helper and a client hook that owns the direction lock and element refs. `DraftStage` controls the shared synchronization state and left scroll container; `WechatFormatPanel` renders the toggle and exposes its preview scroll element without owning synchronization math.

**Tech Stack:** Next.js 16 client components, React 19 hooks, TypeScript, Tailwind CSS 4, Vitest, Testing Library.

---

### Task 1: Scroll synchronization utility

**Files:**
- Create: `lib/ui/scroll-sync.ts`
- Test: `lib/ui/scroll-sync.test.ts`

- [ ] **Step 1: Write failing ratio tests**

Test that a source at 50% scroll maps a target to 50%, clamps malformed ratios, and maps a non-scrollable source to zero.

- [ ] **Step 2: Run the utility test and confirm RED**

Run:

```bash
npm test -- lib/ui/scroll-sync.test.ts
```

Expected: FAIL because `syncScrollProgress` does not exist.

- [ ] **Step 3: Implement the pure helper**

Create:

```ts
export type ScrollMetrics = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

export function syncedScrollTop(
  source: ScrollMetrics,
  target: ScrollMetrics
) {
  const sourceMax = Math.max(source.scrollHeight - source.clientHeight, 0);
  const targetMax = Math.max(target.scrollHeight - target.clientHeight, 0);
  if (sourceMax === 0 || targetMax === 0) return 0;
  const ratio = Math.min(Math.max(source.scrollTop / sourceMax, 0), 1);
  return ratio * targetMax;
}
```

- [ ] **Step 4: Run utility tests and confirm GREEN**

Run:

```bash
npm test -- lib/ui/scroll-sync.test.ts
```

Expected: all utility tests pass.

### Task 2: Shared React scroll-sync hook

**Files:**
- Create: `components/hooks/use-scroll-sync.ts`
- Test: `components/hooks/use-scroll-sync.test.tsx`

- [ ] **Step 1: Write failing hook behavior tests**

Render two controlled scroll elements and assert:

- source scroll updates target by progress ratio;
- disabled synchronization leaves the target unchanged;
- reverse scrolling updates the source;
- the short direction lock prevents immediate recursive feedback.

- [ ] **Step 2: Run hook tests and confirm RED**

Run:

```bash
npm test -- components/hooks/use-scroll-sync.test.tsx
```

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement the hook**

The hook returns:

```ts
{
  sourceRef,
  targetRef,
  handleSourceScroll,
  handleTargetScroll,
  resetSyncLock,
}
```

It uses `syncedScrollTop`, a `source | target | null` lock, and a 50ms timeout matching Raphael Publish. It clears the timeout on unmount.

- [ ] **Step 4: Run hook tests and confirm GREEN**

Run:

```bash
npm test -- components/hooks/use-scroll-sync.test.tsx
```

Expected: all hook tests pass.

### Task 3: Fixed-height draft workspace

**Files:**
- Modify: `components/stages/draft-stage.tsx`
- Modify: `components/stages/draft-stage.test.tsx`

- [ ] **Step 1: Write failing layout and integration tests**

Assert:

- the desktop comparison grid has `xl:h-[clamp(620px,calc(100vh-180px),860px)]` and `xl:min-h-0`;
- the left panel is a `flex min-h-0 flex-col` container;
- reading mode exposes `data-testid="draft-scroll-area"` with desktop overflow;
- edit mode textarea fills and scrolls within the same region;
- the synchronization state defaults to enabled.

- [ ] **Step 2: Run stage tests and confirm RED**

Run:

```bash
npm test -- components/stages/draft-stage.test.tsx
```

Expected: FAIL on missing workspace classes and scroll area.

- [ ] **Step 3: Implement fixed-height left panel**

Use the shared hook in `DraftStage`, hold `scrollSyncEnabled`, attach `sourceRef` and `handleSourceScroll` to the rendered article wrapper or textarea, and reset the lock when the draft version or edit mode changes.

Keep mobile natural height. Apply fixed height and overflow behavior only at `xl`.

- [ ] **Step 4: Run stage tests and confirm GREEN**

Run:

```bash
npm test -- components/stages/draft-stage.test.tsx
```

Expected: all stage tests pass.

### Task 4: Preview toolbar, scroll area, and toggle

**Files:**
- Modify: `components/wechat-format-panel.tsx`
- Modify: `components/wechat-format-panel.test.tsx`

- [ ] **Step 1: Write failing preview tests**

Pass preview ref/callback props and assert:

- preview scroll area uses the supplied ref and scroll handler;
- the “滚动同步开” button is pressed by default and invokes the toggle callback;
- top controls and bottom copy controls are outside the preview scroll element;
- the panel uses `min-h-0` so the preview can shrink within the fixed workspace.

- [ ] **Step 2: Run panel tests and confirm RED**

Run:

```bash
npm test -- components/wechat-format-panel.test.tsx
```

Expected: FAIL on missing synchronization props and toggle.

- [ ] **Step 3: Implement preview integration**

Add optional props:

```ts
previewScrollRef?: React.Ref<HTMLDivElement>;
onPreviewScroll?: React.UIEventHandler<HTMLDivElement>;
scrollSyncEnabled?: boolean;
onToggleScrollSync?: () => void;
```

Move status, theme controls, and synchronization toggle into a fixed top toolbar. Keep copy controls in a fixed bottom area. Only the rendered article area scrolls.

- [ ] **Step 4: Run panel tests and confirm GREEN**

Run:

```bash
npm test -- components/wechat-format-panel.test.tsx
```

Expected: all panel tests pass.

### Task 5: End-to-end verification

**Files:**
- Modify tests only if verification exposes an uncovered regression.

- [ ] **Step 1: Run focused tests**

```bash
npm test -- lib/ui/scroll-sync.test.ts components/hooks/use-scroll-sync.test.tsx components/stages/draft-stage.test.tsx components/wechat-format-panel.test.tsx
```

- [ ] **Step 2: Run full automated checks**

```bash
npm test
npm run lint
npm run build
git diff --check
```

- [ ] **Step 3: Verify in Chrome**

Using the current long article:

- confirm the workspace height stays within the viewport;
- confirm both sides have independent scrollbars;
- scroll the draft to roughly 70% and verify preview progress follows;
- scroll preview back to roughly 30% and verify draft follows;
- disable synchronization and verify the opposite side no longer moves;
- enter Markdown edit mode and verify the textarea remains the source scroll area;
- verify narrow viewport returns to natural single-column flow.

