import type { GenerateBriefInput } from "@/types/ai";
import { briefResponseSchema } from "../schemas";
import { formatSearchReference } from "./search-context";
import { WRITING_SYSTEM_PROMPT } from "./system";

export function buildBriefPrompt(input: GenerateBriefInput) {
  const qualityWarnings =
    input.searchEnabled &&
    input.searchContext &&
    input.searchContext.notes.length > 0
      ? [
          "=== ⚠️ 质量警告（阅读下方参考信息前必须先看） ===",
          ...input.searchContext.notes,
        ].join("\n")
      : "";

  const searchContext =
    input.searchEnabled && input.searchContext
      ? [
          "",
          qualityWarnings,
          "=== 最新参考信息（仅供参考，不可伪装成第一手经历） ===",
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
      "你现在的任务是作为一个资深的公众号爆款主编，为用户选定的方向生成一份结构化的创作方向确认书（Brief）。",
      "这份 Brief 会直接决定后续大纲、正文和结尾转化的基调，所以必须兼顾真实感、可写性和商业落点。",
      `选题 ID：${input.topicId}`,
      `方向标签：${input.topicLabel}`,
      `选题角度：${input.topicAngle}`,
      `核心观点：${input.coreViewpoint}`,
      `初步受众：${input.targetAudience}`,
      `推荐理由：${input.reason}`,
      `文章体裁：${input.structureType}`,
      searchContext,
      "",
      "请只围绕这个已选选题生成 brief，禁止偏离选题，禁止改写成时间管理、职场成长或任何未在上方出现的话题。",
      "",
      "请输出以下维度，并严格符合 Schema：",
      "1. 核心目标（objective）：必须直接服务于这个选题最想打破的认知或最想建立的判断，不能写成泛泛的知识科普。",
      "2. 目标读者（audience）：必须具体到正在面对某种压力、场景或卡点的人，而不是笼统的大众。",
      "3. IP 人设（persona）：明确这篇文章是谁在说话，最好像一个踩过坑、愿意把方法掰开说明白的真人专家，且必须包含该 IP 的核心价值观/信仰。",
      "4. 语气基调（tone）：规定整篇文章的沟通口吻（如真诚、犀利、具体、专业），严禁说教。",
      "5. 商业落脚点（dropOffPoint）：明确文章写到最后，希望读者记住什么价值、产生什么情绪，或愿意采取什么行动。",
      "6. 写作约束（constraints）：至少包含真实案例、真实场景、具体步骤或关键对比的要求，同时明确要避免空泛说教、虚假经历和假大空表达。",
      "",
      "persona 和 dropOffPoint 绝对不能留空，必须写成具体、可落地、像真人会说的话。",
      "constraints 必须帮助作者把这个选题写得更具体，尤其要提醒后续写作补充真实案例、真实场景和可执行步骤。",
      "【SEO 强制传递】：如果上方提供了【可参考的搜索关键词】，必须在 constraints 数组中单列一条指令，要求后续大纲与正文必须高频自然地使用这些 SEO 关键词。",
      "如果素材不足，也只能要求作者补充真实信息，不能自己编造。",
      "如果上方出现了最新参考信息，只能借用其中的痛点表达、平台语境和关键词线索，不能伪装成你的亲身经历，也不能把搜索结果原句直接照搬成正文口吻。",
    ].join("\n"),
    outputSchema: briefResponseSchema,
  };
}
