"use client";

import { SearchToggle } from "../search-toggle";
import { useWorkflowContext } from "../workflow-context";

export function IdeaStage() {
  const {
    state,
    loading,
    canGenerate,
    handleIdeaChange,
    handleGenerateTopics,
    handleSetSearchEnabled,
  } =
    useWorkflowContext();

  return (
    <section className="space-y-6">
      <div>
        <p className="editorial-kicker text-xs font-semibold text-stone-500">
          第一步
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#233044]">
          先把命题说清楚
        </h2>
        <p className="editorial-copy mt-3 max-w-2xl text-sm text-stone-600">
          不用一上来就写成标题。先把你真正想写的议题、冲突或问题说清楚，后面再由系统帮你收敛成切口。
        </p>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-stone-800">
          核心想法
        </span>
        <textarea
          aria-label="核心想法"
          className="min-h-44 w-full rounded-[28px] border border-[var(--line-soft)] bg-[rgba(252,253,255,0.98)] px-5 py-4 text-base text-stone-900 outline-none transition focus:border-[var(--line-strong)]"
          placeholder="例如：高手是怎么用 Codex 做 AI 编程，最后做出自己的产品"
          value={state.ideaInput}
          disabled={loading}
          onChange={(event) => handleIdeaChange(event.target.value)}
        />
        <p className="mt-3 text-xs leading-5 text-stone-500">
          建议写成“我想讨论什么问题 / 给谁看 / 为什么值得讨论”，不用现在就包装成标题。
        </p>
      </label>

      <SearchToggle
        checked={state.searchSettings.topics}
        disabled={loading}
        onChange={(checked) => handleSetSearchEnabled("topics", checked)}
      />

      <button
        type="button"
        className="rounded-full bg-[#233044] px-5 py-3 text-sm font-semibold text-stone-50 transition hover:-translate-y-0.5 hover:bg-[#1a2432] disabled:cursor-not-allowed disabled:bg-stone-300"
        onClick={() => void handleGenerateTopics()}
        disabled={loading || !state.ideaInput.trim() || !canGenerate}
      >
        {loading ? "生成中..." : canGenerate ? "生成选题方向" : "积分不足"}
      </button>
    </section>
  );
}
