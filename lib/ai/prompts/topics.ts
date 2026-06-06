import type { GenerateTopicsInput } from "@/types/ai";
import { topicResponseSchema } from "../schemas";
import { formatSearchReference } from "./search-context";
import { WRITING_SYSTEM_PROMPT } from "./system";

export function buildTopicsPrompt(input: GenerateTopicsInput) {
  const qualityWarnings =
    input.searchEnabled &&
    input.searchContext &&
    input.searchContext.notes.length > 0
      ? [
          "=== ⚠️ 质量警告（阅读下方参考资料前必须先看） ===",
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
      "你现在的任务是作为一个资深的公众号爆款策划，基于用户提供的核心想法，为其发散并生成【3 个】具备垂直爆款潜质的公众号选题方向。",
      "",
      "=== 用户的初始想法 ===",
      `${input.idea}`,
      "",
      "=== 选题生成与质量铁律 ===",
      "1. 【智能处理用户输入】",
      "   - 若输入极短或信息不足：请基于公众号内容经验，自动补足合理的目标读者与使用场景，再生成选题。",
      "   - 若输入极长：请先提炼核心主题，排除无关噪音，再生成选题。",
      "2. 【爆款选题三要素】切忌生成大而全的泛泛方向。每个选题都必须带出明确的目标读者、核心场景，以及【生存级痛点】（即读者不解决会极度焦虑、主动搜索、甚至愿意花钱的核心卡点，严禁生成不痛不痒的伪需求）。",
      "3. 【仍按当前结构输出】请严格符合现有 Schema：",
      "   - title：该选题的内部工作代号，仅用于说明切入点，严禁包装成吸引点击的最终标题。",
      "   - label：用 4-8 个字概括这个选题的切入方向标签。",
      "   - angle：写清这篇文章从哪个极度细分的具体切口展开叙述。",
      "   - summary：压缩写出这条选题的核心观点、适合读者，以及为什么值得做的推荐理由。",
      "   - coreViewpoint：单独写出最核心的一句判断，不能只是 summary 的重复缩写。",
      "   - targetAudience：单独写出最适合阅读这篇文章的人群。",
      "   - reason：单独写出这条选题值得做、可能有传播力或商业价值的原因。",
      "4. 【SEO 占位铁律】如果下方提供了【可参考的搜索关键词】，必须将其自然地融入：在 label 中提炼 1-2 个核心词，在 summary 中合理布局多个相关长尾词，以提前抢占微信搜索权重。",
      "5. 【主编判断】每个方向都要体现出明显差异，不要只是同一句话换几个近义词；推荐理由要让用户感觉这个切口有流量潜力或商业价值。",
      "6. 【质量警告优先】如果上方出现了【质量警告】，请带着批判眼光阅读参考资料，生成时必须优先避开同质化切口、拥挤表达和已疲劳烂词。",
      "7. 【搜索结果只作参考】如果上方出现了最新参考信息，只能借用其中的痛点表达、平台语境和关键词线索，不能伪装成你的亲身经历，也不能把搜索结果原句直接照搬成正文口吻。",
      searchContext,
      "",
      "请基于以上要求，生成 3 个公众号选题方向。",
    ].join("\n"),
    outputSchema: topicResponseSchema,
  };
}
