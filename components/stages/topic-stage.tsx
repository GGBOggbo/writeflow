"use client";

import { useWorkflowContext } from "../workflow-context";

export function TopicStage() {
  const { state, loading, handleSelectTopic } = useWorkflowContext();

  return (
    <section className="space-y-6">
      <div>
        <p className="editorial-kicker text-xs font-semibold text-stone-500">
          第二步
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#233044]">
          选题会：选出最值得展开的切口
        </h2>
        <p className="editorial-copy mt-3 max-w-3xl text-sm text-stone-600">
          先不要急着生成正文。挑出最值得写、最容易打动目标读者、也最适合继续展开的那个方向。
        </p>
        {loading && state.selectedTopicId ? (
          <div className="mt-4 inline-flex items-center rounded-full bg-[#233044] px-4 py-2 text-sm font-medium text-stone-50">
            正在根据这个方向生成写作提纲...
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {state.topicOptions.map((topic) => {
          const isSelected = state.selectedTopicId === topic.id;
          const isWaiting = loading && isSelected;
          const metaLabelClass = isSelected ? "text-stone-500" : "text-stone-400";
          const metaValueClass = isSelected ? "text-stone-800" : "text-stone-700";

          return (
            <button
              key={topic.id}
              type="button"
              aria-label={`选择 ${topic.title}`}
              className={[
                "relative overflow-hidden rounded-[28px] border p-5 text-left shadow-sm transition",
                isSelected
                  ? "border-[rgba(35,48,68,0.16)] bg-[#e9f0f7] text-[#233044] shadow-[0_26px_60px_rgba(24,35,50,0.1)]"
                  : "border-[rgba(35,48,68,0.08)] bg-[rgba(252,253,255,0.98)]",
                loading && !isSelected
                  ? "cursor-not-allowed opacity-45"
                  : "hover:-translate-y-1 hover:border-[rgba(35,48,68,0.16)]",
              ].join(" ")}
              onClick={() => handleSelectTopic(topic.id)}
              disabled={loading}
            >
              {isSelected ? (
                <span className="absolute right-4 top-4 rounded-full border border-[rgba(35,48,68,0.08)] bg-white/88 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#233044]">
                  已入围
                </span>
              ) : null}
              <p
                className={[
                  "text-sm font-semibold",
                  isSelected ? "text-[#233044]" : "text-stone-900",
                ].join(" ")}
              >
                {topic.title}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className={[
                    "inline-flex rounded-full px-3 py-1 text-xs font-medium",
                    isSelected
                      ? "bg-white/88 text-[#233044]"
                      : "bg-stone-100 text-stone-700",
                  ].join(" ")}
                >
                  {topic.label}
                </span>
              </div>
              <dl className="mt-4 space-y-4">
                <div>
                  <dt className={["text-[11px] font-semibold uppercase tracking-[0.16em]", metaLabelClass].join(" ")}>
                    切入角度
                  </dt>
                  <dd className={["mt-1 text-sm leading-6", metaValueClass].join(" ")}>
                    {topic.angle}
                  </dd>
                </div>
                <div>
                  <dt className={["text-[11px] font-semibold uppercase tracking-[0.16em]", metaLabelClass].join(" ")}>
                    核心观点
                  </dt>
                  <dd className={["mt-1 text-sm leading-6", metaValueClass].join(" ")}>
                    {topic.coreViewpoint}
                  </dd>
                </div>
                <div>
                  <dt className={["text-[11px] font-semibold uppercase tracking-[0.16em]", metaLabelClass].join(" ")}>
                    适合谁看
                  </dt>
                  <dd className={["mt-1 text-sm leading-6", metaValueClass].join(" ")}>
                    {topic.targetAudience}
                  </dd>
                </div>
                <div>
                  <dt className={["text-[11px] font-semibold uppercase tracking-[0.16em]", metaLabelClass].join(" ")}>
                    为什么值得写
                  </dt>
                  <dd className={["mt-1 text-sm leading-6", metaValueClass].join(" ")}>
                    {topic.reason}
                  </dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-2">
                <span
                  className={[
                    "inline-flex rounded-full px-3 py-1 text-[11px] font-medium",
                    isSelected ? "bg-white/88 text-[#233044]" : "bg-[#eef3f8] text-stone-700",
                  ].join(" ")}
                >
                  适合继续展开
                </span>
                <span
                  className={[
                    "inline-flex rounded-full px-3 py-1 text-[11px] font-medium",
                    isSelected ? "bg-white/88 text-stone-700" : "bg-[#f4f7fb] text-stone-600",
                  ].join(" ")}
                >
                  可进入 Brief
                </span>
              </div>
              {isWaiting ? (
                <p className="mt-4 text-sm font-medium text-stone-800">
                  正在生成写作提纲...
                </p>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
