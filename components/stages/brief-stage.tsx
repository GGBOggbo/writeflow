"use client";

import { useWorkflowContext } from "../workflow-context";
import { getSelectedTopic } from "../hooks/use-workflow";
import {
  STRUCTURE_TYPE_OPTIONS,
  type Brief,
  type StructureType,
} from "@/types/workflow";

export function BriefStage() {
  const {
    state,
    loading,
    canGenerate,
    handleConfirmBrief,
    handleBriefUpdate,
    handleStructureTypeChange,
  } = useWorkflowContext();
  const topic = getSelectedTopic(state);
  const { brief } = state;

  if (!topic) {
    return null;
  }

  if (!brief) {
    return (
      <section className="space-y-6">
        <div>
          <p className="editorial-kicker text-xs font-semibold text-stone-500">
            第三步
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--accent-ink)]">
            正在生成写作策略单
          </h2>
          <p className="editorial-copy mt-3 text-sm text-stone-600">
            正在根据这个选题生成写作提纲，你很快就能看到目标、读者、人设、语气、落脚点和约束建议。
          </p>
        </div>

        <div className="rounded-[28px] border border-[var(--line-soft)] bg-[rgba(252,253,255,0.98)] p-6 shadow-sm">
          <p className="text-sm font-semibold text-stone-900">{topic.title}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {["目标", "读者", "人设", "语气", "落脚点", "约束"].map((label) => (
              <div key={label} className="space-y-2">
                <div className="h-3 w-16 rounded-full bg-stone-200" />
                <div className="h-16 rounded-2xl bg-stone-100" />
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="rounded-full bg-stone-300 px-5 py-3 text-sm font-semibold text-stone-50"
          disabled
        >
          正在生成写作提纲...
        </button>
      </section>
    );
  }

  const updateField = <K extends keyof Brief>(key: K, value: Brief[K]) => {
    handleBriefUpdate({ ...brief, [key]: value });
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="editorial-kicker text-xs font-semibold text-stone-500">
          第三步
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--accent-ink)]">
          把策略单定稳
        </h2>
        <p className="editorial-copy mt-3 text-sm text-stone-600">
          你可以直接编辑下方每个维度，调整完再确认。
        </p>
      </div>

      <div className="rounded-[28px] border border-[var(--line-soft)] bg-[rgba(252,253,255,0.98)] p-6 shadow-sm">
        <p className="text-sm font-semibold text-stone-900">{topic.title}</p>
        <div className="mt-5">
          <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-stone-500">
            文章结构类型
          </label>
          <select
            aria-label="文章结构类型"
            className="w-full rounded-2xl border border-[var(--line-soft)] bg-[#f7fafc] px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-[var(--line-strong)]"
            value={state.structureType}
            disabled={loading}
            onChange={(e) =>
              handleStructureTypeChange(e.target.value as StructureType)
            }
          >
            {STRUCTURE_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-stone-400">
            这会影响大纲推进方式、正文节奏和标题摘要包装。
          </p>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-stone-500">
              目标
            </label>
            <textarea
              className="w-full rounded-2xl border border-[var(--line-soft)] bg-[#f7fafc] px-4 py-3 text-sm leading-6 text-stone-700 outline-none transition focus:border-[var(--line-strong)]"
              rows={2}
              value={brief.objective}
              disabled={loading}
              onChange={(e) => updateField("objective", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-stone-500">
              读者
            </label>
            <textarea
              className="w-full rounded-2xl border border-[var(--line-soft)] bg-[#f7fafc] px-4 py-3 text-sm leading-6 text-stone-700 outline-none transition focus:border-[var(--line-strong)]"
              rows={2}
              value={brief.audience}
              disabled={loading}
              onChange={(e) => updateField("audience", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-stone-500">
              人设
            </label>
            <textarea
              className="w-full rounded-2xl border border-[var(--line-soft)] bg-[#f7fafc] px-4 py-3 text-sm leading-6 text-stone-700 outline-none transition focus:border-[var(--line-strong)]"
              rows={3}
              value={brief.persona}
              disabled={loading}
              onChange={(e) => updateField("persona", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-stone-500">
              语气
            </label>
            <textarea
              className="w-full rounded-2xl border border-[var(--line-soft)] bg-[#f7fafc] px-4 py-3 text-sm leading-6 text-stone-700 outline-none transition focus:border-[var(--line-strong)]"
              rows={2}
              value={brief.tone}
              disabled={loading}
              onChange={(e) => updateField("tone", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-stone-500">
              落脚点
            </label>
            <textarea
              className="w-full rounded-2xl border border-[var(--line-soft)] bg-[#f7fafc] px-4 py-3 text-sm leading-6 text-stone-700 outline-none transition focus:border-[var(--line-strong)]"
              rows={3}
              value={brief.dropOffPoint}
              disabled={loading}
              onChange={(e) => updateField("dropOffPoint", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-stone-500">
              约束
            </label>
            <textarea
              className="w-full rounded-2xl border border-[var(--line-soft)] bg-[#f7fafc] px-4 py-3 text-sm leading-6 text-stone-700 outline-none transition focus:border-[var(--line-strong)]"
              rows={3}
              value={brief.constraints.join("\n")}
              disabled={loading}
              onChange={(e) =>
                updateField(
                  "constraints",
                  e.target.value
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean)
                )
              }
            />
            <p className="mt-1 text-xs text-stone-400">每行一条约束</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="rounded-full bg-[var(--accent-ink)] px-5 py-3 text-sm font-semibold text-stone-50 transition hover:-translate-y-0.5 hover:bg-[#1a2432] disabled:cursor-not-allowed disabled:bg-stone-300"
        onClick={() => void handleConfirmBrief()}
        disabled={loading || !canGenerate}
      >
        {loading ? "正在生成大纲..." : canGenerate ? "确认提纲" : "积分不足"}
      </button>
    </section>
  );
}
