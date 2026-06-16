"use client";

import { useWorkflowContext } from "../workflow-context";
import { ProseText } from "../prose-text";
import { CoverGuidance } from "./cover-guidance";

export function FinalStage() {
  const {
    state,
    copyLabel,
    copyFailed,
    handleBackToMeta,
    handleSelectFinal,
    handleSelectTitle,
    handleSelectSummary,
    handleCopyFinal,
  } = useWorkflowContext();

  const selectedDraftId =
    state.finalSelection.draftVersionId ?? state.selectedDraftVersionId;
  const activeDraft =
    state.draftVersions.find((draft) => draft.id === selectedDraftId) ??
    state.draftVersions[0];
  const activeTitle =
    state.titleOptions.find((title) => title.id === state.finalSelection.titleId) ??
    state.titleOptions[0];
  const activeSummary =
    state.summaryOptions.find(
      (summary) => summary.id === state.finalSelection.summaryId
    ) ?? state.summaryOptions[0];

  return (
    <section className="space-y-6">
      <div>
        <p className="editorial-kicker text-xs font-semibold text-stone-500">
          第七步
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#233044]">
          出稿确认：把整篇稿子收成一份
        </h2>
        <button
          type="button"
          className="mt-3 text-sm font-medium text-stone-500 transition hover:text-stone-900"
          onClick={handleBackToMeta}
        >
          返回标题摘要
        </button>
      </div>

      <div className="rounded-[28px] border border-[var(--line-soft)] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-stone-900">选择最终稿</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {state.draftVersions.map((draft) => (
            <button
              key={draft.id}
              type="button"
              className={[
                "rounded-full px-4 py-2 text-sm font-medium transition",
                draft.id === activeDraft?.id
                  ? "border border-[rgba(35,48,68,0.16)] bg-[#e9f0f7] text-[#233044]"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200",
              ].join(" ")}
              onClick={() => handleSelectFinal(draft.id)}
            >
              {draft.label}
            </button>
          ))}
        </div>
        <ProseText content={activeDraft?.content ?? ""} className="mt-5 rounded-[24px] border border-[var(--line-soft)] bg-stone-50/95 p-5 text-sm leading-7 text-stone-700" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[28px] border border-[var(--line-soft)] bg-[#f6f9fc] p-6 shadow-sm">
          <p className="text-sm font-semibold text-stone-900">当前标题</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {state.titleOptions.map((title) => (
              <button
                key={title.id}
                type="button"
                className={[
                "rounded-full px-4 py-2 text-sm font-medium transition",
                title.id === activeTitle?.id
                    ? "border border-[rgba(35,48,68,0.16)] bg-[#e9f0f7] text-[#233044]"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200",
                ].join(" ")}
                onClick={() => handleSelectTitle(title.id)}
              >
                {title.label}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-stone-700">
            {activeTitle?.content}
          </p>
        </div>
        <div className="rounded-[28px] border border-[var(--line-soft)] bg-[#fcfdff] p-6 shadow-sm">
          <p className="text-sm font-semibold text-stone-900">当前摘要</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {state.summaryOptions.map((summary) => (
              <button
                key={summary.id}
                type="button"
                className={[
                "rounded-full px-4 py-2 text-sm font-medium transition",
                summary.id === activeSummary?.id
                    ? "border border-[rgba(35,48,68,0.16)] bg-[#e9f0f7] text-[#233044]"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200",
                ].join(" ")}
                onClick={() => handleSelectSummary(summary.id)}
              >
                {summary.label}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-stone-700">
            {activeSummary?.content}
          </p>
        </div>
      </div>

      <CoverGuidance
        suggestion={state.coverSuggestion}
        imagePrompt={state.coverImagePrompt}
      />

      <button
        type="button"
        className="rounded-full bg-[#233044] px-5 py-3 text-sm font-semibold text-stone-50 transition hover:-translate-y-0.5 hover:bg-[#1a2432]"
        onClick={handleCopyFinal}
      >
        {copyLabel}
      </button>
      {copyFailed ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-stone-600">
            自动复制不可用，请点击下方文本框，全选后手动复制：
          </p>
          <textarea
            readOnly
            className="w-full rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm leading-7 text-stone-700 outline-none focus:border-stone-400"
            rows={12}
            value={[
              state.titleOptions.find((t) => t.id === state.finalSelection.titleId)
                ?.content ?? state.titleOptions[0]?.content ?? "",
              state.summaryOptions.find((s) => s.id === state.finalSelection.summaryId)
                ?.content
                ? `摘要：${state.summaryOptions.find((s) => s.id === state.finalSelection.summaryId)?.content}`
                : null,
              state.draftVersions.find((d) => d.id === selectedDraftId)?.content ??
                state.draftVersions[0]?.content ??
                "",
            ]
              .filter(Boolean)
              .join("\n\n")}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
        </div>
      ) : null}
    </section>
  );
}
