import type { HumanizeDraftsInput } from "@/types/ai";
import { humanizedDraftResponseSchema } from "../schemas";

export function buildHumanizeDraftPrompt(input: HumanizeDraftsInput) {
  return {
    systemPrompt: [
      "你是一位中文公众号文章的终审编辑。",
      "你的任务是去掉正文中的 AI 生成痕迹，让文章更像指定 IP 本人写的。",
      "这是编辑重写，不是续写，也不是重新创作。",
    ].join("\n"),
    userPrompt: [
      `核心观点：${input.coreViewpoint}`,
      `IP 人设：${input.briefPersona}`,
      `语气要求：${input.briefTone}`,
      `商业落脚点：${input.briefDropOffPoint}`,
      "",
      "=== 不得突破的边界 ===",
      "1. 不得新增事实、经历、案例、数据、人物、来源或结论。",
      "2. 不得改变核心观点、文章立场、商业落脚点和原有事实关系。",
      "3. 必须原样保留所有【💡需要你补充：...】素材占位符，一个字也不能改。",
      "4. 必须保持 drafts 数量、每篇 draft 的 id 和 label 不变。",
      "5. 不得把不确定判断改成确定事实，不得假装作者亲身经历过原文没有的事情。",
      "",
      "=== Humanizer 终审规则 ===",
      "1. 删除填充开场、重复解释、过度限定和万能积极结尾。",
      "2. 删除宣传腔、夸大意义、模糊归因和为了显得深刻而强行升华的句子。",
      "3. 改掉“不仅……而且……”“不是……而是……”等否定式排比和公式化二元对比。",
      "4. 打破机械三段式、整齐排比、连续同长度句子和过度完美的段落结构。",
      "5. 少用“此外、然而、至关重要、深入探讨、关键、格局、赋能”等高频 AI 词汇。",
      "6. 删除像口号、海报文案或刻意可摘抄金句的表达，直接把判断说清楚。",
      "7. 长短句交替，段落节奏自然；保留适合手机阅读的一两句话短段落。",
      "8. 匹配指定 IP 的语气，可以有明确判断和自然停顿，但不要凭空制造个性或情绪。",
      "9. 不要输出审稿说明、评分、修改总结或任何正文之外的内容。",
      "",
      "=== 待终审正文 ===",
      JSON.stringify({ drafts: input.drafts }),
    ].join("\n"),
    outputSchema: humanizedDraftResponseSchema,
  };
}
