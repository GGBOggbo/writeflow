"use client";

import { useWorkflowContext } from "./workflow-context";
import type { WorkflowStep } from "@/types/workflow";
import { canGoToWorkflowStep } from "@/lib/state-machine";

const stages: Array<{ step: WorkflowStep; label: string }> = [
  { step: "idea_input", label: "想法" },
  { step: "topic_select", label: "选题" },
  { step: "brief_confirm", label: "提纲" },
  { step: "outline_review", label: "大纲" },
  { step: "draft_review", label: "正文" },
  { step: "meta_review", label: "标题摘要" },
  { step: "finalize", label: "定稿" },
];

function getFurthestReachedStepIndex(state: ReturnType<typeof useWorkflowContext>["state"]) {
  if (state.currentStep === "finalize") return 6;
  if (state.titleOptions.length > 0) return 5;
  if (state.draftVersions.length > 0) return 4;
  if (state.outline.length > 0) return 3;
  if (state.brief) return 2;
  if (state.topicOptions.length > 0) return 1;
  return 0;
}

export function WorkflowStatus() {
  const { state, loading, handleGoToStep } = useWorkflowContext();
  const currentIndex = stages.findIndex((stage) => stage.step === state.currentStep);
  const furthestReachedIndex = getFurthestReachedStepIndex(state);
  const clickableUpperBound = Math.max(currentIndex, furthestReachedIndex);

  return (
    <div className="grid gap-3 md:grid-cols-7" data-onboarding-target="workflow-pipeline">
      {stages.map((stage, index) => {
        const isActive = stage.step === state.currentStep;
        const isComplete =
          !loading &&
          !isActive &&
          index <= clickableUpperBound &&
          canGoToWorkflowStep(state, stage.step);
        const statusLabel = isActive
          ? "当前推进中"
          : isComplete
            ? "点击回看"
            : index < currentIndex
              ? "已经过"
              : "待进入";

        if (isComplete) {
          return (
            <button
              key={stage.step}
              type="button"
              className="group rounded-[24px] border border-[rgba(35,48,68,0.12)] bg-[rgba(247,250,252,0.98)] px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-[rgba(35,48,68,0.18)] hover:bg-white hover:shadow-[0_14px_28px_rgba(28,39,52,0.08)]"
              onClick={() => handleGoToStep(stage.step)}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                0{index + 1}
              </p>
              <p className="mt-2 text-sm font-semibold text-[#233044]">
                {stage.label}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-[#6c8b74]">{statusLabel}</p>
                <span className="rounded-full bg-[#233044] px-2.5 py-1 text-[11px] font-semibold text-white">
                  回看
                </span>
              </div>
            </button>
          );
        }

        return (
          <div
            key={stage.step}
            className={[
              "rounded-[24px] border px-4 py-4 transition-colors",
              isActive
                ? "border-[rgba(35,48,68,0.18)] bg-[#233044] text-stone-50 shadow-[0_18px_40px_rgba(24,35,50,0.2)]"
                : "border-[rgba(35,48,68,0.08)] bg-[rgba(242,246,250,0.9)] text-stone-500",
            ].join(" ")}
          >
            <p className={["text-[11px] font-semibold uppercase tracking-[0.2em]", isActive ? "text-stone-300" : "text-stone-400"].join(" ")}>
              0{index + 1}
            </p>
            <p className={["mt-2 text-sm font-semibold", isActive ? "text-stone-50" : "text-[#233044]"].join(" ")}>
              {stage.label}
            </p>
            <p className={["mt-1 text-xs", isActive ? "text-stone-300" : "text-stone-400"].join(" ")}>
              {statusLabel}
            </p>
          </div>
        );
      })}
    </div>
  );
}
