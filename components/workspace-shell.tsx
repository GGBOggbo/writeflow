"use client";

import { useWorkflowContext } from "./workflow-context";
import { ChatPanel } from "./chat-panel";
import { ManuscriptPanel } from "./manuscript-panel";
import { WorkflowStatus } from "./workflow-status";
import { getSelectedTopic } from "./hooks/use-workflow";

const stepSummaries = {
  idea_input: "先把要写的命题说清楚，再让系统帮你收敛方向。",
  topic_select: "挑出最值得展开的切口，让后续所有内容都围绕它推进。",
  brief_confirm: "把立场、人设、语气和结构策略定稳，后面才不会越写越散。",
  outline_review: "先审结构和素材槽位，再生成正文会更稳。",
  draft_review: "对读正文版本，决定哪一版最接近你要的成稿气质。",
  meta_review: "给稿件做最后的包装判断，决定标题、摘要和封面表达。",
  finalize: "把正文、标题、摘要和封面建议收成一份可发的稿件。",
} as const;

export function WorkspaceShell() {
  const {
    state,
    resetPending,
    handleRequestResetWorkflow,
    handleCancelResetWorkflow,
    handleConfirmResetWorkflow,
  } = useWorkflowContext();
  const selectedTopic = getSelectedTopic(state);
  const heroTitle =
    selectedTopic?.label ??
    (state.currentStep === "idea_input" ? "主编陪跑型 AI 共创工作台" : "等待选题收敛");
  const showStructureType = [
    "brief_confirm",
    "outline_review",
    "draft_review",
    "meta_review",
    "finalize",
  ].includes(state.currentStep);
  const enabledSearchStages = [
    state.searchSettings.topics ? "选题联网搜索" : null,
  ].filter(Boolean);
  const statusChips = [
    `主题：${selectedTopic?.title ?? "等待选题收敛"}`,
    enabledSearchStages.length > 0
      ? `参考：${enabledSearchStages.join(" / ")}`
      : "参考：基础模式",
    "目标：产出一篇可发布的完整稿件",
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1540px] flex-col gap-6 px-4 py-5 md:px-6 xl:px-8">
      <header className="editorial-card editorial-card-strong editorial-texture relative overflow-hidden rounded-[36px] px-6 py-6 md:px-8 md:py-8">
        <div className="absolute inset-y-0 right-0 hidden w-[34%] bg-[radial-gradient(circle_at_top_right,rgba(207,220,235,0.5),transparent_58%),linear-gradient(180deg,rgba(255,255,255,0.32),transparent)] lg:block" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
            <span className="rounded-full border border-[var(--line-soft)] bg-white/60 px-3 py-1">
              主编陪跑型工作台
            </span>
            <span>第 {["idea_input","topic_select","brief_confirm","outline_review","draft_review","meta_review","finalize"].indexOf(state.currentStep) + 1} 步</span>
            {showStructureType ? <span>当前结构：{state.structureType}</span> : null}
          </div>

          <div className="mt-5">
            <p className="editorial-kicker text-xs font-semibold text-[#5f7993]">
              当前稿件
            </p>
            <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="max-w-4xl text-3xl font-semibold tracking-[-0.04em] text-[#233044] md:text-5xl">
                  {heroTitle}
                </h1>
                <p className="editorial-copy mt-4 max-w-3xl text-sm text-stone-700 md:text-[15px]">
                  {stepSummaries[state.currentStep]}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {resetPending ? (
                  <>
                    <button
                      type="button"
                      className="inline-flex rounded-full border border-[rgba(184,108,95,0.24)] bg-[rgba(255,244,241,0.96)] px-4 py-2 text-sm font-medium text-[var(--accent-rose)] transition hover:-translate-y-0.5"
                      onClick={handleConfirmResetWorkflow}
                    >
                      确认清空当前稿件
                    </button>
                    <button
                      type="button"
                      className="inline-flex rounded-full border border-[rgba(35,48,68,0.12)] bg-white/80 px-4 py-2 text-sm font-medium text-stone-600 transition hover:-translate-y-0.5 hover:text-stone-900"
                      onClick={handleCancelResetWorkflow}
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="inline-flex rounded-full border border-[rgba(35,48,68,0.18)] bg-[#233044] px-4 py-2 text-sm font-medium text-stone-50 transition hover:-translate-y-0.5 hover:bg-[#1a2432]"
                    onClick={handleRequestResetWorkflow}
                  >
                    开启新稿
                  </button>
                )}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {statusChips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex rounded-full border border-[rgba(35,48,68,0.08)] bg-white/88 px-3.5 py-2 text-sm text-stone-700"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <WorkflowStatus />
          </div>
        </div>
      </header>

      <div className="grid flex-1 gap-6 xl:grid-cols-[320px_1fr]">
        <div className="min-h-[560px] xl:sticky xl:top-5 xl:self-start">
          <ChatPanel />
        </div>
        <div className="min-h-[560px]">
          <ManuscriptPanel />
        </div>
      </div>
    </main>
  );
}
