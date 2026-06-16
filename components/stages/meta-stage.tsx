"use client";

import { useWorkflowContext } from "../workflow-context";
import { CoverGuidance } from "./cover-guidance";

export function MetaStage() {
  const {
    state,
    handleSelectTitle,
    handleSelectSummary,
    handleContinueToFinal,
  } = useWorkflowContext();

  return (
    <section className="space-y-6">
      <div>
        <p className="editorial-kicker text-xs font-semibold text-stone-500">
          第六步
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#233044]">
          包装定案：标题、摘要与封面表达
        </h2>
        <p className="editorial-copy mt-3 text-sm text-stone-600">
          这里会给你 5 种不同模型的标题和 3 种不同风格的摘要。先挑一组最顺手的包装，再进入最终定稿。
        </p>
      </div>

      <CoverGuidance
        suggestion={state.coverSuggestion}
        imagePrompt={state.coverImagePrompt}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[28px] border border-[var(--line-soft)] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-stone-900">标题方案</p>
          <div className="mt-4 space-y-3">
            {state.titleOptions.map((title) => (
              <button
                key={title.id}
                type="button"
                className={[
                  "block w-full rounded-2xl border p-4 text-left transition",
                  title.id === state.finalSelection.titleId
                    ? "border-[var(--line-strong)] bg-[#edf3fa]"
                    : "border-[var(--line-soft)] bg-stone-50 hover:border-stone-300",
                ].join(" ")}
                onClick={() => handleSelectTitle(title.id)}
              >
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">
                  {title.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-700">
                  {title.content}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-[var(--line-soft)] bg-[#f6f9fc] p-6 shadow-sm">
          <p className="text-sm font-semibold text-stone-900">摘要方案</p>
          <div className="mt-4 space-y-3">
            {state.summaryOptions.map((summary) => (
              <button
                key={summary.id}
                type="button"
                className={[
                  "block w-full rounded-2xl border p-4 text-left transition",
                  summary.id === state.finalSelection.summaryId
                    ? "border-[var(--line-strong)] bg-white"
                    : "border-[var(--line-soft)] bg-white hover:border-stone-300",
                ].join(" ")}
                onClick={() => handleSelectSummary(summary.id)}
              >
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">
                  {summary.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-700">
                  {summary.content}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="rounded-full bg-[#233044] px-5 py-3 text-sm font-semibold text-stone-50 transition hover:-translate-y-0.5 hover:bg-[#1a2432]"
        onClick={handleContinueToFinal}
      >
        进入最终定稿
      </button>
    </section>
  );
}
