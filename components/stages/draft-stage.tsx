"use client";

import { useEffect, useState } from "react";
import { useWorkflowContext } from "../workflow-context";
import { useScrollSync } from "../hooks/use-scroll-sync";
import { WechatFormatPanel } from "../wechat-format-panel";

export function DraftStage() {
  const {
    state,
    loading,
    canGenerate,
    requestStatus,
    handleSelectDraft,
    handleUpdateDraft,
    handleFormatDraft,
    handleCompleteDraftMaterials,
    handleGenerateMeta,
  } = useWorkflowContext();
  const [scrollSyncEnabled, setScrollSyncEnabled] = useState(true);
  const {
    sourceRef,
    targetRef,
    handleSourceScroll,
    handleTargetScroll,
    resetSyncLock,
  } = useScrollSync(scrollSyncEnabled);

  const activeDraft =
    state.draftVersions.find((draft) => draft.id === state.selectedDraftVersionId) ??
    state.draftVersions[0];
  const isFormatting =
    loading && requestStatus?.action === "format_draft";
  const isCompletingMaterials =
    loading && requestStatus?.action === "complete_draft_materials";
  const hasMaterialPlaceholder = activeDraft
    ? /【💡需要你补充：[^】]+】/.test(activeDraft.content)
    : false;
  const hasCompletedMaterials = state.draftVersions.some(
    (draft) => draft.label === "AI 补充版"
  );
  useEffect(() => {
    resetSyncLock();
  }, [activeDraft?.id, resetSyncLock]);

  const selectDraft = (draftId: string) => {
    handleSelectDraft(draftId);
  };

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

      <fieldset>
        <legend className="sr-only">选择版本</legend>
        <div className="flex flex-wrap gap-2">
          {state.draftVersions.map((draft) => {
            const active = draft.id === activeDraft?.id;
            return (
              <button
                key={draft.id}
                type="button"
                aria-pressed={active}
                className={[
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  active
                    ? "bg-[#233044] text-stone-50"
                    : "border border-[rgba(35,48,68,0.16)] bg-white text-[#233044] hover:bg-[#f3f7fb]",
                ].join(" ")}
                onClick={() => selectDraft(draft.id)}
                disabled={loading}
              >
                {draft.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div
        data-testid="draft-workspace"
        className="grid gap-4 xl:h-[1160px] xl:grid-cols-2"
      >
        <div
          data-testid="draft-body-panel"
          className="flex flex-col rounded-[28px] border border-[var(--line-soft)] bg-[#fcfdff] p-6 shadow-sm xl:min-h-0 xl:overflow-hidden"
        >
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-stone-900">
                Markdown 正文
              </p>
              <p className="mt-1 text-xs text-stone-500">
                修改后会自动保存，并同步更新右侧预览。
              </p>
              <p className="mt-1 text-[11px] leading-5 text-stone-400">
                AI 会保留原文主线，编辑阅读节奏并按内容选择模块；当前正文保留，不扣积分。
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-full border border-[rgba(35,48,68,0.16)] bg-white px-3 py-2 text-xs font-semibold text-[#233044] transition hover:bg-[#f3f7fb] disabled:cursor-default disabled:bg-stone-100 disabled:text-stone-400"
              onClick={() => void handleFormatDraft()}
              disabled={loading || !activeDraft || hasMaterialPlaceholder}
              title={
                hasMaterialPlaceholder
                  ? "正文还有需要补充的素材占位符，请先用 AI 补充素材后再排版。"
                  : undefined
              }
            >
              {isFormatting
                ? "正在 AI 编辑排版..."
                : hasMaterialPlaceholder
                  ? "先补充素材再排版"
                  : "AI 编辑排版（免费）"}
            </button>
          </div>
          <label
            data-testid="draft-editor-layout"
            className="mt-4 block xl:flex xl:min-h-0 xl:flex-1"
          >
            <span className="sr-only">Markdown 正文</span>
            <textarea
              ref={(node) => {
                sourceRef.current = node;
              }}
              data-testid="draft-scroll-area"
              aria-label="Markdown 正文"
              className="min-h-[520px] w-full resize-y rounded-[20px] border border-stone-300 bg-[#fbfbfa] p-5 font-mono text-sm leading-7 text-stone-800 outline-none focus:border-[#6688a4] focus:ring-2 focus:ring-[#6688a4]/15 xl:h-full xl:min-h-0 xl:flex-1 xl:resize-none"
              value={activeDraft?.content ?? ""}
              onScroll={handleSourceScroll}
              onChange={(event) => {
                if (activeDraft) {
                  handleUpdateDraft(activeDraft.id, event.target.value);
                }
              }}
            />
          </label>
        </div>

        {activeDraft ? (
          <WechatFormatPanel
            key={activeDraft.id}
            draftLabel={activeDraft.label}
            content={activeDraft.content}
            previewScrollRef={(node) => {
              targetRef.current = node;
            }}
            onPreviewScroll={handleTargetScroll}
            scrollSyncEnabled={scrollSyncEnabled}
            onToggleScrollSync={() =>
              setScrollSyncEnabled((enabled) => !enabled)
            }
          />
        ) : null}
      </div>

      <div data-testid="draft-workflow-actions" className="flex flex-wrap gap-3">
        {hasMaterialPlaceholder ? (
          <button
            type="button"
            className="rounded-full border border-[#c96442]/35 bg-[#fff8f3] px-5 py-3 text-sm font-semibold text-[#a84f35] transition hover:-translate-y-0.5 hover:bg-[#f8e9df] disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
            onClick={() => void handleCompleteDraftMaterials()}
            disabled={loading || hasCompletedMaterials}
          >
            {isCompletingMaterials
              ? "正在补充素材..."
              : hasCompletedMaterials
                ? "已补充素材"
                : "AI 补充素材（免费）"}
          </button>
        ) : null}
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
}
