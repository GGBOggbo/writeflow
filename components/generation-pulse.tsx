"use client";

import type { WorkflowProgressEvent, WorkflowProgressStepId } from "@/lib/progress/types";

type GenerationAction =
  | "generate_topics"
  | "select_topic"
  | "confirm_brief"
  | "generate_drafts"
  | "format_draft"
  | "complete_draft_materials"
  | "generate_meta";

type GenerationPulseStep = {
  label: string;
  detail: string;
  eventIds: WorkflowProgressStepId[];
};

const actionTimelines: Record<GenerationAction, GenerationPulseStep[]> = {
  generate_topics: [
    {
      label: "理解创作意图",
      detail: "提炼主题、实体和需要避开的方向",
      eventIds: [
        "topic_search_planning_started",
        "topic_search_planning_completed",
      ],
    },
    {
      label: "看清同类内容",
      detail: "摸清大家都在谈什么",
      eventIds: ["search_query_built", "web_search_started", "web_search_completed"],
    },
    {
      label: "寻找真实信号",
      detail: "优先保留更有反馈的表达",
      eventIds: [
        "results_normalized",
        "engagement_enrichment_started",
        "engagement_enrichment_completed",
      ],
    },
    {
      label: "拆出有效打法",
      detail: "看懂哪些结构和情绪真正留人",
      eventIds: ["deep_dive_started", "deep_dive_completed"],
    },
    {
      label: "策划你的切口",
      detail: "避开同质化，给出 3 条可展开方向",
      eventIds: ["topics_generation_started", "topics_generation_completed"],
    },
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
  format_draft: [
    {
      label: "理解正文节奏",
      detail: "识别小标题、重点句和适合卡片呈现的内容",
      eventIds: ["markdown_formatting_started"],
    },
    {
      label: "整理 Markdown 与模块",
      detail: "生成可编辑、可直接预览的排版版",
      eventIds: [
        "markdown_formatting_started",
        "markdown_formatting_completed",
        "markdown_formatting_degraded",
      ],
    },
  ],
  complete_draft_materials: [
    {
      label: "检查素材槽位",
      detail: "判断哪些内容有现有资料支持",
      eventIds: ["draft_material_completion_started"],
    },
    {
      label: "保守补充正文",
      detail: "不虚构经历，无依据的槽位继续保留",
      eventIds: [
        "draft_material_completion_started",
        "draft_material_completion_completed",
      ],
    },
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
  const isTopicGeneration = action === "generate_topics";
  const heading = isTopicGeneration ? "主编正在判断" : "生成导演台";
  const description = isTopicGeneration
    ? "先看清外面怎么写，再替你寻找不撞车的切口。"
    : message ?? "系统正在推进当前阶段...";

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
              {heading}
            </p>
            <p className="editorial-copy mt-2 text-sm font-medium text-[#233044]">
              {description}
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
