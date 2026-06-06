"use client";

import type { WorkflowProgressEvent, WorkflowProgressStepId } from "@/lib/progress/types";

type GenerationAction =
  | "generate_topics"
  | "select_topic"
  | "confirm_brief"
  | "generate_drafts"
  | "generate_meta";

type GenerationPulseStep = {
  label: string;
  detail: string;
  eventIds: WorkflowProgressStepId[];
};

const actionTimelines: Record<GenerationAction, GenerationPulseStep[]> = {
  generate_topics: [
    { label: "提炼搜索词", detail: "从想法里抽赛道、人群和痛点", eventIds: ["search_query_built"] },
    { label: "微信搜一搜", detail: "按热度抓公众号参考", eventIds: ["web_search_started", "web_search_completed"] },
    { label: "8 篇建档", detail: "规范化成 SearchResult", eventIds: ["results_normalized"] },
    { label: "5 篇互动验证", detail: "读取阅读、点赞、收藏、评论", eventIds: ["engagement_enrichment_started", "engagement_enrichment_completed"] },
    { label: "2 篇深拆", detail: "抓 HTML 正文与高赞评论", eventIds: ["deep_dive_started", "deep_dive_completed"] },
    { label: "生成选题", detail: "把参考压进 3 个方向", eventIds: ["topics_generation_started", "topics_generation_completed"] },
  ],
  select_topic: [
    { label: "锁定切口", detail: "确认方向、人群和核心观点", eventIds: ["brief_generation_started"] },
    { label: "复用参考", detail: "沿用选题阶段搜索上下文", eventIds: ["brief_generation_started"] },
    { label: "形成策略单", detail: "生成目标、语气和商业落脚点", eventIds: ["brief_generation_started", "brief_generation_completed"] },
  ],
  confirm_brief: [
    { label: "读取策略单", detail: "目标、人设、约束入场", eventIds: ["outline_generation_started"] },
    { label: "拆正文骨架", detail: "生成 4-6 个推进节点", eventIds: ["outline_generation_started", "outline_generation_completed"] },
    { label: "标素材槽位", detail: "指出需要补真实案例的位置", eventIds: ["outline_generation_completed"] },
  ],
  generate_drafts: [
    { label: "复用选题参考", detail: "读取 2 篇核心深拆文", eventIds: ["benchmark_summary_started"] },
    { label: "AI 总结对标文", detail: "提炼卡点、结构和节奏", eventIds: ["benchmark_summary_started", "benchmark_summary_completed"] },
    { label: "吸收评论卡点", detail: "把高赞评论转成读者需求", eventIds: ["benchmark_summary_completed"] },
    { label: "生成正文初稿", detail: "按大纲和人设组装成稿", eventIds: ["draft_generation_started", "draft_generation_completed"] },
  ],
  generate_meta: [
    { label: "读取正文", detail: "只基于已选正文包装", eventIds: ["meta_generation_started"] },
    { label: "参考热门标题", detail: "复用选题搜索结果和 SEO 词", eventIds: ["meta_generation_started"] },
    { label: "拆 5 类标题", detail: "利益、痛点、反常识、趋势、实录", eventIds: ["meta_generation_started"] },
    { label: "生成摘要封面", detail: "补 3 条摘要和封面建议", eventIds: ["meta_generation_started", "meta_generation_completed"] },
  ],
};

const fallbackTimeline: GenerationPulseStep[] = [
  { label: "读取上下文", detail: "保留当前稿件判断", eventIds: [] },
  { label: "推理生成", detail: "按当前阶段推进", eventIds: [] },
  { label: "回填结果", detail: "更新工作台内容", eventIds: [] },
];

export function getGenerationPulseSteps(action?: GenerationAction | null) {
  return action ? actionTimelines[action] ?? fallbackTimeline : fallbackTimeline;
}

function getStepState(
  step: GenerationPulseStep,
  index: number,
  steps: GenerationPulseStep[],
  eventIds: Set<WorkflowProgressStepId>
) {
  const hasEvent = step.eventIds.some((id) => eventIds.has(id));
  const laterHasEvent = steps
    .slice(index + 1)
    .some((laterStep) => laterStep.eventIds.some((id) => eventIds.has(id)));

  if (laterHasEvent || step.eventIds.some((id) => id.endsWith("_completed") && eventIds.has(id))) {
    return "done";
  }

  if (hasEvent) {
    return "active";
  }

  return "waiting";
}

export function GenerationPulse({
  loading,
  action,
  message,
  events = [],
}: {
  loading: boolean;
  action?: GenerationAction | null;
  message?: string;
  events?: WorkflowProgressEvent[];
}) {
  if (!loading) {
    return null;
  }

  const steps = getGenerationPulseSteps(action);
  const eventIds = new Set(events.map((event) => event.stepId));

  return (
    <section
      className="generation-pulse rounded-[24px] border border-[rgba(95,121,147,0.16)] bg-[linear-gradient(135deg,#f8fbfd,#eef4f8)] p-4"
      aria-live="polite"
    >
      <div className="generation-pulse__scan" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5f7993]">
              生成导演台
            </p>
            <p className="editorial-copy mt-2 text-sm font-medium text-[#233044]">
              {message ?? "系统正在推进当前阶段..."}
            </p>
          </div>
          <span className="generation-pulse__orb" aria-hidden="true" />
        </div>

        <ol className="mt-4 grid gap-2">
          {steps.map((step, index) => {
            const state = getStepState(step, index, steps, eventIds);

            return (
              <li
                key={step.label}
                className={`generation-pulse__step generation-pulse__step--${state}`}
                style={{ ["--pulse-index" as string]: index }}
              >
                <span className="generation-pulse__dot" aria-hidden="true">
                  {state === "done" ? "✓" : index + 1}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{step.label}</span>
                  <span className="block text-xs text-stone-500">{step.detail}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
