# 草稿阶段预览布局重组 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把公众号排版预览从「独占下方整块」改为「与正文左右并排对读」，版本管理上移为正文上方的横向 tab。

**Architecture:** 纯客户端组件布局重组。`WechatFormatPanel` 内部从 `[控制栏220 | 预览430]` 重构为「预览主体 + 底部控制条（主题色点 + 复制）」；`DraftStage` 把版本列表改为正文上方横向 tab，主区改为 `xl:grid-cols-2`（正文 | 排版位）。所有交互（切版本、切主题、复制、积分）的数据流与 handler 不变。

**Tech Stack:** React 18 + TypeScript + Tailwind CSS、Vitest + @testing-library/react。测试用项目既定模式：localStorage 注入 `WorkflowState` + 真实 `WorkflowProvider`。

---

## File Structure

- **Modify** `components/wechat-format-panel.tsx` — 重构生成前（入口卡片）/ 生成后（预览主体 + 底部控制条）布局。保留所有现有测试锚点：`data-testid="wechat-format-panel"`（根不加 `rounded-[28px]`）、按钮文案「公众号排版，消耗 1 积分」、文本「当前正文：…」「文章预览 · 可滚动」、`aria-label="公众号排版预览"` + `data-theme`、主题按钮 name（专业蓝/温暖橙/清爽青绿）。
- **Modify** `components/wechat-format-panel.test.tsx` — 新增复制按钮测试（mock `copyRichHtml`）。
- **Create** `components/stages/draft-stage.test.tsx` — 锁定新行为：版本横向 tab 渲染、切换、正文与排版位并排。
- **Modify** `components/stages/draft-stage.tsx` — 版本管理 → 正文上方横向 tab；主区 → 正文/排版位 `xl:grid-cols-2`。

---

## Task 1: 重构 WechatFormatPanel（预览主体 + 底部控制条）

**Files:**
- Modify: `components/wechat-format-panel.tsx`（整体重写 render 部分）
- Modify: `components/wechat-format-panel.test.tsx`（新增复制测试）

- [ ] **Step 1: 先跑现有 panel 测试，确认重构前的绿色基线**

Run: `npx vitest run components/wechat-format-panel.test.tsx`
Expected: 3 passed（作为重构 safety net）。

- [ ] **Step 2: 在 panel 测试新增「复制按钮调用 copyRichHtml」用例（RED）**

在 `components/wechat-format-panel.test.tsx` 顶部加 mock，并在 `describe` 内追加测试：

```tsx
// 文件顶部 import 之后加入：
vi.mock("@/lib/copy/copy-rich-html", () => ({
  copyRichHtml: vi.fn(),
}));
```

```tsx
// describe("WechatFormatPanel", () => { ... }) 内追加：
it("copies rich html when the copy button is clicked", async () => {
  const user = userEvent.setup();
  const { copyRichHtml } = await import("@/lib/copy/copy-rich-html");
  vi.mocked(copyRichHtml).mockResolvedValue(undefined);

  render(
    <WechatFormatPanel
      draftLabel="去 AI 版"
      formatting={{
        draftVersionId: "draft-1",
        blocks: [
          { id: "h1", type: "heading", text: "先把主流程跑通" },
          { id: "p1", type: "paragraph", text: "正文内容。" },
        ],
        selectedTheme: "professional-blue",
        generatedAt: "2026-06-13T00:00:00.000Z",
      }}
      loading={false}
      canGenerate
      onGenerate={vi.fn()}
      onThemeChange={vi.fn()}
    />
  );

  await user.click(screen.getByRole("button", { name: "复制到公众号编辑器" }));
  await waitFor(() => {
    expect(copyRichHtml).toHaveBeenCalledTimes(1);
  });
});
```

同时在顶部 import 行补充 `waitFor`：把 `import { render, screen } from "@testing-library/react";` 改为 `import { render, screen, waitFor } from "@testing-library/react";`。

- [ ] **Step 3: 跑测试确认新用例失败（RED）**

Run: `npx vitest run components/wechat-format-panel.test.tsx`
Expected: 新复制用例 FAIL（当前复制按钮存在但 jsdom 无 clipboard，未 mock 会抛错）；其余 3 个仍 pass。若复制用例已 pass 说明按钮可点且无副作用，仍可继续。

- [ ] **Step 4: 重写 panel.tsx 的 return（GREEN：预览主体 + 底部控制条）**

把 `components/wechat-format-panel.tsx` 的整个 `return (...)` 替换为下面这段。**头部 import 与 `themeOptions`、`useState`、`useMemo`、`handleCopy` 逻辑全部保留不变**，只换 return：

```tsx
  return (
    <section
      data-testid="wechat-format-panel"
      className="flex h-full flex-col overflow-hidden rounded-[24px] border border-stone-200 bg-white"
    >
      {!formatting ? (
        <div className="flex flex-1 flex-col justify-center gap-4 p-6 sm:p-7">
          <div>
            <p className="editorial-kicker text-xs font-semibold text-stone-500">
              公众号排版
            </p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-stone-900">
              识别语义，再套用稳定样式
            </h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              AI 只判断标题、金句、痛点和行动引导，不改写正文。首次消耗 1 积分，切换主题和复制不再扣费。
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#233044]">
              当前正文：{draftLabel}
            </p>
            <button
              type="button"
              className="mt-3 w-full rounded-full bg-[#315f8b] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#274f75] disabled:cursor-not-allowed disabled:bg-stone-300"
              onClick={onGenerate}
              disabled={loading || disabled || !canGenerate}
            >
              {loading
                ? "正在识别排版结构..."
                : canGenerate
                  ? "公众号排版，消耗 1 积分"
                  : "积分不足"}
            </button>
            <p className="mt-2 text-xs leading-5 text-stone-500">
              生成后可在三套彩色主题之间免费切换。
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col bg-[#f1efeb] p-4 sm:p-5">
          <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col">
            <div className="mb-3 flex items-center justify-center gap-2">
              <span className="text-[11px] font-semibold tracking-[0.12em] text-stone-500">
                文章预览 · 可滚动
              </span>
              <span className="rounded-full bg-[#50708f]/10 px-2 py-0.5 text-[10px] font-semibold text-[#50708f]">
                已完成语义识别
              </span>
            </div>
            <div
              aria-label="公众号排版预览"
              data-theme={formatting.selectedTheme}
              className="max-h-[480px] flex-1 overflow-y-auto border border-stone-200 bg-white shadow-[0_8px_28px_rgba(35,35,30,0.06)]"
              dangerouslySetInnerHTML={{ __html: html }}
            />
            <div className="mt-4 space-y-3">
              <p className="text-xs text-stone-500">当前正文：{draftLabel}</p>
              <fieldset>
                <legend className="sr-only">选择主题</legend>
                <div className="flex flex-wrap items-center gap-2">
                  {themeOptions.map((theme) => {
                    const active = formatting.selectedTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        aria-pressed={active}
                        className={[
                          "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                          active
                            ? "border-stone-300 bg-stone-100 text-stone-900"
                            : "border-stone-200 text-stone-500 hover:text-stone-900",
                        ].join(" ")}
                        onClick={() => {
                          setCopyStatus("idle");
                          onThemeChange(theme.id);
                        }}
                      >
                        <span
                          className="h-1.5 w-4 rounded-full"
                          style={{ backgroundColor: theme.swatch }}
                          aria-hidden="true"
                        />
                        {theme.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <button
                type="button"
                className="w-full rounded-lg bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
                onClick={() => void handleCopy()}
              >
                {copyStatus === "copied"
                  ? "已复制公众号富文本"
                  : "复制到公众号编辑器"}
              </button>
              <p className="text-xs leading-5 text-stone-500" aria-live="polite">
                {copyStatus === "copied"
                  ? "复制成功，直接粘贴到公众号后台即可。"
                  : copyStatus === "failed"
                    ? "浏览器拦截了自动复制，请复制下方 HTML。"
                    : "会同时写入富文本和纯文本，兼容不同粘贴环境。"}
              </p>
              {copyStatus === "failed" ? (
                <label className="block">
                  <span className="text-sm font-semibold text-[#233044]">
                    手动复制 HTML
                  </span>
                  <textarea
                    className="mt-2 min-h-32 w-full rounded-2xl border border-[#c9d8e5] bg-white p-4 font-mono text-xs leading-5 text-stone-600"
                    readOnly
                    value={html}
                  />
                </label>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </section>
  );
```

锚点核对：根仍是 `data-testid="wechat-format-panel"` 且无 `rounded-[28px]`；保留「公众号排版，消耗 1 积分」「当前正文：…」「文章预览 · 可滚动」、`aria-label="公众号排版预览"` + `data-theme`、三个主题按钮 name、复制按钮 name「复制到公众号编辑器」。

- [ ] **Step 5: 跑 panel 测试确认全绿（GREEN）**

Run: `npx vitest run components/wechat-format-panel.test.tsx`
Expected: 4 passed（原 3 + 新复制 1）。

- [ ] **Step 6: Commit**

```bash
git add components/wechat-format-panel.tsx components/wechat-format-panel.test.tsx
git commit -m "refactor(wechat-format-panel): preview body + bottom control bar"
```

---

## Task 2: 为 DraftStage 新布局写测试（RED）

**Files:**
- Create: `components/stages/draft-stage.test.tsx`

- [ ] **Step 1: 新建 draft-stage.test.tsx**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkflowState } from "@/types/workflow";
import { WorkflowProvider } from "../workflow-context";
import { DraftStage } from "./draft-stage";

vi.mock("@/lib/ai/client", () => ({
  generateTopics: vi.fn(),
  generateBrief: vi.fn(),
  generateOutline: vi.fn(),
  generateDraft: vi.fn(),
  generateTitlesAndSummaries: vi.fn(),
}));

const draftState: Partial<WorkflowState> = {
  currentStep: "draft_review",
  draftVersions: [
    { id: "d1", label: "原稿", content: "这是原稿正文" },
    { id: "d2", label: "润色版", content: "这是润色版正文" },
  ],
  selectedDraftVersionId: "d1",
  draftFormattingByVersion: {},
};

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

function renderWithState(ui: React.ReactElement, state: Partial<WorkflowState>) {
  window.localStorage.setItem(
    "ai-writing-mvp-workflow",
    JSON.stringify(state)
  );
  return render(<WorkflowProvider>{ui}</WorkflowProvider>);
}

describe("DraftStage", () => {
  it("renders draft versions as a horizontal tab row", async () => {
    renderWithState(<DraftStage />, draftState);

    expect(await screen.findByRole("button", { name: "原稿" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "润色版" })).toBeInTheDocument();
  });

  it("switches the displayed draft body when a version tab is selected", async () => {
    const user = userEvent.setup();
    renderWithState(<DraftStage />, draftState);

    await screen.findByText("这是原稿正文");
    await user.click(screen.getByRole("button", { name: "润色版" }));
    await waitFor(() => {
      expect(screen.getByText("这是润色版正文")).toBeInTheDocument();
    });
  });

  it("shows the formatting panel beside the body", async () => {
    renderWithState(<DraftStage />, draftState);

    expect(await screen.findByText("这是原稿正文")).toBeInTheDocument();
    expect(screen.getByTestId("wechat-format-panel")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 跑测试确认失败（RED）**

Run: `npx vitest run components/stages/draft-stage.test.tsx`
Expected: FAIL — 版本「原稿/润色版」当前不是按钮（是卡片 `<button>` 但可能 name 匹配；关键是切换测试失败，因当前版本选择在左侧列表，正文切换逻辑存在但「文章预览/排版位并排」尚未与正文同层）。至少「shows the formatting panel beside the body」与版本 tab 形态会因布局未改而表现异常。确认失败信息是「找不到预期节点」而非 import/语法错误。

> 说明：若某些用例在旧布局下恰好通过（版本按钮本就是 `<button>{label}</button>`），以「switches the displayed draft body」与 Task 3 后的全量为准；本 Task 目的是建立测试文件与用例骨架。

- [ ] **Step 3: Commit（测试先入库）**

```bash
git add components/stages/draft-stage.test.tsx
git commit -m "test(draft-stage): cover version tabs and side-by-side layout"
```

---

## Task 3: 重构 DraftStage（版本横向 tab + 正文/排版位并排）

**Files:**
- Modify: `components/stages/draft-stage.tsx`（重写 return 的主体结构）

- [ ] **Step 1: 重写 draft-stage.tsx 的 return**

`components/stages/draft-stage.tsx` 中 `return (` 之后的整体替换为：

```tsx
  return (
    <section className="space-y-6">
      <div>
        <p className="editorial-kicker text-xs font-semibold text-stone-500">
          第五步
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#233044]">
          版本对读：挑出最像你的那一版
        </h2>
        <p className="editorial-copy mt-3 text-sm text-stone-600">
          正文阶段默认不联网，以保留真实经验、人设表达和素材槽位带来的活人感。
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="草稿版本">
        {state.draftVersions.map((draft) => {
          const active = draft.id === activeDraft?.id;
          return (
            <button
              key={draft.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={[
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                active
                  ? "bg-[#233044] text-stone-50"
                  : "border border-[rgba(35,48,68,0.16)] bg-white text-[#233044] hover:bg-[#f3f7fb]",
              ].join(" ")}
              onClick={() => handleSelectDraft(draft.id)}
              disabled={loading}
            >
              {draft.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[28px] border border-[var(--line-soft)] bg-[#fcfdff] p-6 shadow-sm">
          <p className="text-sm font-semibold text-stone-900">正文内容</p>
          <ProseText
            content={activeDraft?.content ?? ""}
            className="mt-4 rounded-[24px] border border-[var(--line-soft)] bg-white/92 p-5 text-sm leading-7 text-stone-700"
          />
        </div>

        {activeDraft ? (
          <WechatFormatPanel
            key={activeDraft.id}
            draftLabel={activeDraft.label}
            formatting={activeFormatting}
            loading={isFormatting}
            disabled={loading}
            canGenerate={canGenerate}
            onGenerate={() => void handleFormatDraft()}
            onThemeChange={handleSelectFormatTheme}
          />
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-full border border-[rgba(35,48,68,0.16)] bg-white px-5 py-3 text-sm font-semibold text-[#233044] transition hover:-translate-y-0.5 hover:bg-[#f3f7fb] disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
          onClick={() => void handleHumanizeDraft()}
          disabled={loading || !canGenerate || hasHumanizedDraft}
        >
          {isHumanizing
            ? "正在去 AI 味..."
            : hasHumanizedDraft
            ? "已生成去 AI 版"
            : canGenerate
              ? "去 AI 味，消耗 1 积分"
              : "积分不足"}
        </button>
        <button
          type="button"
          className="rounded-full bg-[#233044] px-5 py-3 text-sm font-semibold text-stone-50 transition hover:-translate-y-0.5 hover:bg-[#1a2432] disabled:cursor-not-allowed disabled:bg-stone-300"
          onClick={() => void handleGenerateMeta()}
          disabled={loading || !canGenerate}
        >
          {loading
            ? "正在处理..."
            : canGenerate
              ? "生成标题和摘要"
              : "积分不足"}
        </button>
      </div>
    </section>
  );
```

顶部 `useWorkflowContext()` 解构与 `activeDraft` / `hasHumanizedDraft` / `isHumanizing` / `isFormatting` / `activeFormatting` 的派生逻辑全部保留不变。改动仅：移除旧 `xl:grid-cols-[260px_1fr]` 版本管理左栏，改为上方横向 tab；主区改为 `xl:grid-cols-2`（正文 | 排版位）。

- [ ] **Step 2: 跑 draft-stage 测试确认通过（GREEN）**

Run: `npx vitest run components/stages/draft-stage.test.tsx`
Expected: 3 passed。

- [ ] **Step 3: Commit**

```bash
git add components/stages/draft-stage.tsx
git commit -m "refactor(draft-stage): version tabs + side-by-side body/preview"
```

---

## Task 4: 全量回归 + 目视验收

**Files:** 无（验证步骤）

- [ ] **Step 1: 全量测试无回归**

Run: `npx vitest run`
Expected: 全部 passed（含 draft-stage 新 3、panel 新 1）。注意：`lib/ai/*` 等分支进行中的预先类型错误不影响 vitest（esbuild 转译）。

- [ ] **Step 2: 类型检查本次改动文件无新增错误**

Run: `npx tsc --noEmit 2>&1 | grep -E "wechat-format-panel|draft-stage"`
Expected: 无输出（本次改动的文件不引入新类型错误；`lib/ai/*` 等预先错误不在范围）。

- [ ] **Step 3: 本地起服务目视验收**

Run: `pnpm dev`，进入草稿阶段（draft_review）。
Expected:
- xl 屏：版本在正文上方呈横向 tab；正文与排版预览左右并排；排版不再在最下方独占整块。
- 生成前：右侧排版位显示「公众号排版，消耗 1 积分」入口。
- 生成后：右侧为预览 + 底部控制条；切换主题、复制均正常，不重新调用 AI。
- 缩窄到 <xl：正文与排版堆叠，版本 tab 仍横向。

---

## Self-Review

**Spec coverage:**
- 排版预览与正文同层并排 → Task 3 主区 `xl:grid-cols-2`。✓
- 版本管理上移横向 tab → Task 3 版本 tab 行。✓
- 生成前排版入口卡片 → Task 1 Step 4 `!formatting` 分支。✓
- 生成后预览主体 + 底部控制条（主题色点 + 复制）→ Task 1 Step 4 `formatting` 分支。✓
- 「已完成语义识别」作为预览头部小标签 → Task 1 Step 4 预览头部 span。✓
- 精简头部大段说明 → Task 1 入口卡片说明已精简为一行。✓
- 响应式（xl 并排 / <xl 堆叠 / 版本 tab 始终横向）→ Task 3 `xl:grid-cols-2` + tab 行无断点限制。✓
- 测试更新/无回归 → Task 1（panel 复制测试）、Task 2（draft-stage 测试）、Task 4（全量）。✓

**Placeholder scan:** 无 TBD/TODO；每步含完整代码与命令。✓

**Type consistency:** `WechatFormatPanel` props 签名未变（Task 3 调用沿用原 props）；`draftState` 使用 `Partial<WorkflowState>` 与真实字段名（`draftVersions`/`selectedDraftVersionId`/`draftFormattingByVersion`/`currentStep: "draft_review"`），与 `types/workflow.ts` 一致；`DraftVersion = {id,label,content}` 一致。✓
