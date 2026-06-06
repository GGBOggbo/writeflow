"use client";

import { useWorkflowContext } from "./workflow-context";
import { BriefStage } from "./stages/brief-stage";
import { DraftStage } from "./stages/draft-stage";
import { FinalStage } from "./stages/final-stage";
import { IdeaStage } from "./stages/idea-stage";
import { MetaStage } from "./stages/meta-stage";
import { OutlineStage } from "./stages/outline-stage";
import { TopicStage } from "./stages/topic-stage";

export function ManuscriptPanel() {
  const { state, error, canRetryLastAction, handleRetryLastAction } =
    useWorkflowContext();

  function renderStage() {
    switch (state.currentStep) {
      case "idea_input":
        return <IdeaStage />;
      case "topic_select":
        return <TopicStage />;
      case "brief_confirm":
        return <BriefStage />;
      case "outline_review":
        return <OutlineStage />;
      case "draft_review":
        return <DraftStage />;
      case "meta_review":
        return <MetaStage />;
      case "finalize":
        return <FinalStage />;
    }
  }

  return (
    <section className="editorial-panel rounded-[34px] p-5 md:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="editorial-kicker text-xs font-semibold text-stone-500">
            成稿工作台
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#233044] md:text-[2rem]">
            当前产出与编辑判断
          </h2>
          <p className="editorial-copy mt-3 max-w-3xl text-sm text-stone-600">
            每一步都不是单纯展示结果，而是帮你判断这篇稿子该如何继续收紧、打磨和推进。
          </p>
        </div>
        {error ? (
          <div className="flex flex-wrap items-center gap-2 rounded-[24px] border border-[rgba(184,108,95,0.24)] bg-[rgba(255,244,241,0.92)] px-4 py-2 text-sm text-[var(--accent-rose)]">
            <span>{error}</span>
            {canRetryLastAction ? (
              <button
                type="button"
                className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[var(--accent-rose)] transition hover:bg-white"
                onClick={handleRetryLastAction}
              >
                重试当前步骤
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="rounded-[32px] border border-[rgba(35,48,68,0.08)] bg-[#fcfdff] p-5 shadow-[0_18px_42px_rgba(28,39,52,0.05)] md:p-6">
        {renderStage()}
      </div>
    </section>
  );
}
