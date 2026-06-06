"use client";

import { useWorkflowContext } from "./workflow-context";
import type { WorkflowState } from "@/types/workflow";
import { getSelectedTopic } from "@/components/hooks/use-workflow";
import { GenerationPulse } from "./generation-pulse";

const stepLabels: Record<WorkflowState["currentStep"], string> = {
  idea_input: "定义命题",
  topic_select: "收敛选题",
  brief_confirm: "定策略单",
  outline_review: "审结构",
  draft_review: "对读正文",
  meta_review: "定包装",
  finalize: "出稿确认",
};

export function ChatPanel() {
  const { state, loading, error, requestStatus } = useWorkflowContext();
  const selectedTopic = getSelectedTopic(state);
  const currentBrief =
    {
      idea_input: {
        task: "把这篇文章真正要解决的问题说清楚，不要急着写标题。",
        why: "起点越准，后面每一步的 AI 生成就越像在放大你的判断，而不是替你乱猜。",
        checklist: ["是否足够具体", "是否真的有人在意", "是否能继续拆成选题"],
      },
      topic_select: {
        task: "从多个方向里挑出最值得展开的切口，先做方向判断，再做内容判断。",
        why: "这一步决定文章的抓手和后续 Brief 的立场，不宜靠感觉随便点。",
        checklist: ["痛点够不够硬", "人群够不够清楚", "切口是否过挤"],
      },
      brief_confirm: {
        task: "把目标、读者、人设、语气和落脚点定稳，确保后面生成的是同一篇文章。",
        why: "Brief 是整篇稿子的策略单，越清晰，后面越不容易出现看似有内容、实则跑偏的结果。",
        checklist: ["目标是否单一", "人设是否稳定", "结构类型是否匹配"],
      },
      outline_review: {
        task: "先审结构，再看素材槽位够不够支撑这篇文章。",
        why: "大纲对，正文才可能顺。素材槽位清楚，文章才更像活人写出来的。",
        checklist: ["段落顺序是否自然", "论证推进是否完整", "素材位置是否明确"],
      },
      draft_review: {
        task: "比较不同正文版本，挑出最接近你表达意图的那一版。",
        why: "正文阶段默认断网，就是为了让成稿保住真实感和人设，不被最新网页语气冲散。",
        checklist: ["开头是否抓人", "论证是否稳", "语气是否像你"],
      },
      meta_review: {
        task: "在标题、摘要和封面表达之间做发布前最后判断。",
        why: "这一步不是装饰，而是决定用户会不会点开、会不会继续读。",
        checklist: ["标题是否够准", "摘要是否够清", "包装是否不过度套路"],
      },
      finalize: {
        task: "确认最终正文、标题和摘要，整理成一份可直接发出的稿件。",
        why: "最后一步的重点不是再扩写，而是检查组合后的整体气质是否统一。",
        checklist: ["正文已定版", "标题与摘要一致", "复制内容可直接使用"],
      },
    }[state.currentStep];

  const strategySignals = buildStrategySignals(state);

  return (
    <section className="editorial-panel flex h-full flex-col overflow-hidden rounded-[32px] p-4 md:p-5">
      <div className="rounded-[26px] bg-[linear-gradient(180deg,#fbfdff,#f2f6fa)] p-5">
        <p className="editorial-kicker text-[11px] font-semibold text-stone-500">
          主编台
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#233044]">
          {stepLabels[state.currentStep]}
        </h2>
        <p className="editorial-copy mt-3 text-sm text-stone-700">
          {loading
            ? requestStatus?.message ?? "系统正在推进当前阶段，我会保留你的上下文和判断线索。"
            : currentBrief.task}
        </p>
      </div>

      <div className="mt-4 grid gap-3">
        <GenerationPulse
          loading={loading}
          action={requestStatus?.action}
          message={requestStatus?.message}
          events={requestStatus?.events}
        />

        <section className="editorial-card rounded-[24px] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            策略信号
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {strategySignals.map((signal) => (
              <span
                key={signal}
                className="inline-flex rounded-full border border-[rgba(35,48,68,0.08)] bg-white px-3 py-2 text-xs font-medium text-stone-700"
              >
                {signal}
              </span>
            ))}
          </div>
          {error ? (
            <p className="mt-4 rounded-2xl border border-[rgba(184,108,95,0.24)] bg-[rgba(255,244,241,0.92)] px-4 py-3 text-sm text-[var(--accent-rose)]">
              {error}
            </p>
          ) : null}
        </section>

        <section className="editorial-card rounded-[24px] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            当前稿件线索
          </p>
          <dl className="mt-3 space-y-3 text-sm text-stone-700">
            <div>
              <dt className="text-stone-500">核心想法</dt>
              <dd className="mt-1 line-clamp-3 text-[#233044]">
                {state.ideaInput.trim() || "等待输入"}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">当前切口</dt>
              <dd className="mt-1 line-clamp-2 text-[#233044]">
                {selectedTopic?.label ?? "还未选定"}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">结构策略</dt>
              <dd className="mt-1 text-[#233044]">
                {state.structureType}
              </dd>
            </div>
          </dl>
        </section>

        <details className="editorial-card rounded-[24px] p-4 text-sm text-stone-700">
          <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            展开阶段说明
          </summary>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                为什么现在做这一步
              </p>
              <p className="editorial-copy mt-2 text-sm text-stone-700">
                {currentBrief.why}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                判断标准
              </p>
              <ul className="mt-2 grid gap-2">
                {currentBrief.checklist.map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-[rgba(35,48,68,0.08)] bg-white px-4 py-3 text-sm text-stone-700"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      </div>
    </section>
  );
}

function buildStrategySignals(state: WorkflowState) {
  const { searchSettings, currentStep } = state;
  const hasTopicSearchContext = state.topicSearchContext?.status === "success";
  const stageSearchState = {
    idea_input: searchSettings.topics ? "选题阶段会联网搜索" : "选题阶段按基础模式推进",
    topic_select: hasTopicSearchContext ? "提纲阶段参考已就绪" : "提纲阶段按基础模式推进",
    brief_confirm: hasTopicSearchContext ? "大纲阶段参考已就绪" : "大纲阶段按基础模式推进",
    outline_review: "先审结构，再决定是否进入正文",
    draft_review: "正文阶段默认断网，保护真实感",
    meta_review:
      hasTopicSearchContext
        ? "标题摘要参考已就绪"
        : "标题摘要阶段按基础模式推进",
    finalize: "当前进入最终稿整理阶段",
  }[currentStep];

  return [stageSearchState, "关键词联网搜索只发生在选题阶段"];
}
