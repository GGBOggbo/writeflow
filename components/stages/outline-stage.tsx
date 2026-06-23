"use client";

import { useWorkflowContext } from "../workflow-context";

export function OutlineStage() {
  const {
    state,
    loading,
    canGenerate,
    handleGenerateDrafts,
  } =
    useWorkflowContext();
  const outlineHeadings = new Map(
    state.outline.map((section) => [section.id, section.heading])
  );

  return (
    <section className="space-y-6">
      <div>
        <p className="editorial-kicker text-xs font-semibold text-stone-500">
          第四步
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--accent-ink)]">
          结构审稿：先看骨架，再看素材
        </h2>
        <p className="editorial-copy mt-3 text-sm text-stone-600">
          大纲是正文的骨架，素材槽位是这篇文章还需要补充的案例、数据或观点位置。先看结构对不对，再生成正文会更稳。
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-[var(--line-soft)] bg-[rgba(252,253,255,0.98)] p-6 shadow-sm">
          <p className="text-sm font-semibold text-stone-900">结构骨架</p>
          <div className="mt-4 space-y-4">
            {state.outline.map((section, index) => (
              <article key={section.id} className="rounded-[24px] border border-[var(--line-soft)] bg-[#f8fbfe] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">
                  第 {index + 1} 段
                </p>
                <p className="mt-2 text-base font-semibold text-stone-900">
                  {section.heading}
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  核心观点：{section.corePoint}
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  支撑建议：{section.supportSuggestion}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#eaf1f8] px-3 py-1 text-[11px] font-medium text-stone-700">
                    节点角色：{section.sectionRole}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-[var(--line-soft)] bg-[#f2f6fa] p-6 shadow-sm">
          <p className="text-sm font-semibold text-stone-900">素材槽位边注</p>
          <div className="mt-4 space-y-4">
            {state.materialSlots.map((slot) => (
              <article key={slot.id} className="rounded-[24px] border border-[var(--line-soft)] bg-white p-4">
                <p className="text-sm font-semibold text-stone-900">
                  {slot.label}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-stone-500">
                  绑定节点：{outlineHeadings.get(slot.targetOutlineId) ?? slot.targetOutlineId}
                </p>
                {slot.placement ? (
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-stone-500">
                    放置位置：{slot.placement}
                  </p>
                ) : null}
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {slot.content}
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  用途：{slot.purpose}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="rounded-full bg-[var(--accent-ink)] px-5 py-3 text-sm font-semibold text-stone-50 transition hover:-translate-y-0.5 hover:bg-[#1a2432] disabled:cursor-not-allowed disabled:bg-stone-300"
        onClick={() => void handleGenerateDrafts()}
        disabled={loading || !canGenerate}
      >
        {loading ? "正在生成正文版本..." : canGenerate ? "生成正文版本" : "积分不足"}
      </button>
    </section>
  );
}
