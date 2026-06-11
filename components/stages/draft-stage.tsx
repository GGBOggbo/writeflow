"use client";

import { useWorkflowContext } from "../workflow-context";
import { ProseText } from "../prose-text";

export function DraftStage() {
  const {
    state,
    loading,
    canGenerate,
    requestStatus,
    handleSelectDraft,
    handleHumanizeDraft,
    handleGenerateMeta,
  } = useWorkflowContext();

  const activeDraft =
    state.draftVersions.find((draft) => draft.id === state.selectedDraftVersionId) ??
    state.draftVersions[0];
  const hasHumanizedDraft = state.draftVersions.some(
    (draft) => draft.label === "去 AI 版"
  );
  const isHumanizing =
    loading && requestStatus?.action === "humanize_draft";

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

      <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
        <div className="rounded-[28px] border border-[var(--line-soft)] bg-[rgba(252,253,255,0.98)] p-4 shadow-sm">
          <p className="px-2 text-sm font-semibold text-stone-900">
            版本管理
          </p>
          <div className="mt-4 space-y-2">
            {state.draftVersions.map((draft) => {
              const active = draft.id === activeDraft?.id;

              return (
                <button
                  key={draft.id}
                  type="button"
                  className={[
                    "w-full rounded-2xl px-4 py-3 text-left text-sm transition",
                    active
                      ? "border border-[rgba(35,48,68,0.16)] bg-[#e9f0f7] text-[#233044]"
                      : "bg-stone-50 text-stone-700 hover:bg-stone-100",
                  ].join(" ")}
                  onClick={() => handleSelectDraft(draft.id)}
                  disabled={loading}
                >
                  {draft.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-[28px] border border-[var(--line-soft)] bg-[#fcfdff] p-6 shadow-sm">
          <p className="text-sm font-semibold text-stone-900">正文内容</p>
          <ProseText content={activeDraft?.content ?? ""} className="mt-4 rounded-[24px] border border-[var(--line-soft)] bg-white/92 p-5 text-sm leading-7 text-stone-700" />
        </div>
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
}
