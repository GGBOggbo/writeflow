import type { GenerateOutlineInput } from "@/types/ai";
import { outlineResponseSchema } from "../schemas";
import { formatSearchReference } from "./search-context";
import { WRITING_SYSTEM_PROMPT } from "./system";

export function buildOutlinePrompt(input: GenerateOutlineInput) {
  const qualityWarnings =
    input.searchEnabled &&
    input.searchContext &&
    input.searchContext.notes.length > 0
      ? [
          "=== ⚠️ 质量警告（阅读下方结构参考前必须先看） ===",
          ...input.searchContext.notes,
        ].join("\n")
      : "";

  const searchContext =
    input.searchEnabled && input.searchContext
      ? [
          "",
          qualityWarnings,
          "=== 最新结构参考（仅供参考，不可直接照搬结构） ===",
          `搜索 query：${input.searchContext.query}`,
          ...input.searchContext.results
            .slice(0, 4)
            .map((result, index) => formatSearchReference(result, index)),
          input.searchContext.seoKeywords.length > 0
            ? `可参考的搜索关键词：${input.searchContext.seoKeywords.join("、")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "";

  return {
    systemPrompt: WRITING_SYSTEM_PROMPT,
    userPrompt: [
      "你现在的任务是基于用户确认的创作思路，搭建一个公众号爆款文章大纲，并在大纲中预留素材槽位，供用户补充真实信息。",
      "",
      "=== 已确认的创作思路 ===",
      `选题 ID：${input.topicId}`,
      `方向标签：${input.topicLabel}`,
      `选题角度：${input.topicAngle}`,
      `核心观点：${input.coreViewpoint}`,
      `初步受众：${input.targetAudience}`,
      `推荐理由：${input.reason}`,
      `文章体裁：${input.structureType}`,
      `IP 人设：${input.briefPersona}`,
      `商业落脚点：${input.briefDropOffPoint}`,
      `写作目标：${input.briefObjective}`,
      `目标读者：${input.briefAudience}`,
      `语气要求：${input.briefTone}`,
      `写作约束：${input.briefConstraints.join(" / ")}`,
      searchContext,
      "",
      "=== 大纲生成铁律（必须绝对遵守） ===",
      "1. 【爆款结构】严禁输出论文式或汇报式大纲。必须根据指定的文章体裁，按照公众号逻辑推进内容，例如：痛点场景引入 -> 核心判断 -> 递进分论点 -> 结尾号召。",
      "2. 【节点颗粒度】请生成 4 到 6 个大纲节点。每个节点都必须能直接扩写成正文，并且要清楚体现：这一段的标题、这一段真正想表达的判断、以及适合补什么案例/步骤/对比来支撑。",
      "3. 【人设一致】整个大纲都要服务于上方 IP 人设，让读者感觉这是一个真实的人在说话，而不是百科或报告。节点命名和支撑建议要体现这个人设的判断力和说话方式。",
      "4. 【素材槽位克制且精准】全文必须且只能设置 3-5 个素材槽位。优先放在开头场景、正文核心案例、结尾转化落脚点。素材槽位只能提示作者补真实信息，严禁替作者编造案例、经历或数据。每个素材槽位都必须填写 targetOutlineId，并且该 targetOutlineId 必须严格对应它所属的 outline 节点 id。",
      "5. 【SEO 占位铁律】如果下方提供了【可参考的搜索关键词】，必须挑出最核心的 2-3 个词，自然地嵌入到对应大纲节点的 heading（小标题）中，以抢占微信搜一搜的算法推荐权重。",
      "6. 【商业闭环与抛球互动】最后一个节点必须是结尾号召。其 supportSuggestion 严禁只写干巴巴的关注引导，必须向读者抛出一个具体的、容易站队或引发吐槽的开放性问句（如：对于XX问题，你怎么看？），以此诱发评论区互动。",
      "7. 【质量警告优先】如果上方出现了【质量警告】，请带着批判眼光阅读结构参考，生成时必须优先避开同质化结构、拥挤表达和已疲劳烂词。",
      "8. 【真实性边界】如果缺少真实素材，只能在素材槽位里说明「这里需要补一个真实案例」之类的提示，绝不能捏造事实。",
      "9. 【强制简洁】为了保证 JSON 完整返回，每个字段都必须短而具体：heading 控制在 24 个字以内；corePoint 控制在 1 句话内；supportSuggestion 控制在 1 句话内；sectionRole 控制在 12 个字以内。",
      "10. 【禁止解释】不要写多余铺垫、不要复述题目、不要生成很长的说明，只输出足够支撑正文的最小结构信息。",
      "11. 【工作流继承】只能基于上游已确认的信息搭结构，不得新增用户没有提到的年份、身份、数据、经历或案例。",
      "",
      "请只围绕这个已选选题与写作说明生成大纲和素材槽位。不要偏离这个选题，不要改写成其他主题，也不要产出通用型空话大纲。",
      "如果上方出现了最新结构参考，只能借用其中的结构思路和表达灵感，不能直接照搬别人文章的结构，也不能伪装成你的亲身经历。",
    ].join("\n"),
    outputSchema: outlineResponseSchema,
  };
}
