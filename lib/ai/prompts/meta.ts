import type { GenerateTitlesAndSummariesInput } from "@/types/ai";
import { metaResponseSchema } from "../schemas";
import { formatSearchReference } from "./search-context";
import { WRITING_SYSTEM_PROMPT } from "./system";

export function buildMetaPrompt(input: GenerateTitlesAndSummariesInput) {
  const qualityWarnings =
    input.searchEnabled &&
    input.searchContext &&
    input.searchContext.notes.length > 0
      ? [
          "=== ⚠️ 质量警告（阅读下方标题参考前必须先看） ===",
          ...input.searchContext.notes,
        ].join("\n")
      : "";

  const searchContext =
    input.searchEnabled && input.searchContext
      ? [
          "",
          qualityWarnings,
          "=== 最新标题参考（仅供包装参考，不可改写正文事实） ===",
          `搜索 query：${input.searchContext.query}`,
          ...input.searchContext.results
            .slice(0, 4)
            .map((result, index) => formatSearchReference(result, index)),
          input.searchContext.seoKeywords.length > 0
            ? `建议自然参考这些搜索关键词：${input.searchContext.seoKeywords.join("、")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "";

  return {
    systemPrompt: WRITING_SYSTEM_PROMPT,
    userPrompt: [
      "你现在的角色是一位拥有极强网感、操盘过大量高传播公众号内容的主编。",
      "你的任务是基于一篇已经完成的公众号正文，提炼出最具点击欲的 5 个标题，以及最具社交货币价值的 3 条摘要。",
      "标题和摘要不是随便包装，而是要准确承接正文的人设、结构、价值判断和落脚点。",
      "",
      "=== 核心参考信息 ===",
      `方向标签：${input.topicLabel}`,
      `核心观点：${input.coreViewpoint}`,
      `切入角度：${input.topicAngle}`,
      `文章体裁：${input.structureType}`,
      `写作目标：${input.briefObjective}`,
      `目标读者：${input.briefAudience}`,
      `IP 人设：${input.briefPersona}`,
      `商业落脚点：${input.briefDropOffPoint}`,
      "",
      "=== 正文最终稿（必须严格基于此草稿进行提炼和包装） ===",
      input.draftContent,
      searchContext,
      "",
      "不要偏离这篇正文已经跑出来的核心观点，不要改写成其他主题。",
      "如果上方出现了【质量警告】，请带着批判眼光阅读标题参考，生成时必须优先避开同质化表达、拥挤套路和已疲劳烂词。",
      "",
      "=== 标题生成铁律（严格输出 5 个） ===",
      "绝不能是对正文的平淡总结！必须提取正文里的反差感、金句或最有价值的信息（如具体数据）。请按照以下 5 种不同模型各生成 1 个标题：",
      "1. 利益结果型：给出明确结果或收益，让读者立刻产生点击动机。可参考公式：《[目标人群]+[场景]+[方法]+[结果]》。",
      "2. 场景痛点型：直接戳中目标读者当前最真实的卡点或焦虑。",
      "3. 反常识/认知冲突型：制造认知反差或悬念。记住爆款铁律：否定句效果永远大于肯定句（如“不是...而是...”）。",
      "4. 新机会趋势型：强调新变化、新机会、新红利，制造怕错过的感觉。",
      "5. 个人故事/实录型：强化真人经历感和第一视角可信度。",
      "【SEO 标题占位铁律】：如果上方提供了【可参考的搜索关键词】，必须将最核心的 SEO 关键词自然无痕地融入标题，优先占住微信搜索的高权重匹配位。",
      "💡 标题加分项：标题尽量优先使用具体数字、时间感词汇（如：今天、4个月）、问句或【！】【?】【｜】等分隔符来增强阅读节奏感。",
      "",
      "=== 摘要生成铁律（严格输出 3 条） ===",
      "请按照以下 3 种风格各生成 1 条摘要，不能缺项，不能重复：",
      "1. 痛点共鸣版：替目标读者说出他们正卡住的痛点和这篇文章能给的解法。",
      "2. 悬念反转版：保留一点信息差，用对比或反常识制造强烈好奇心。",
      "3. 专业克制版：用克制、专业的语气高度概括这篇文章的稀缺价值和方法论。",
      "摘要不是正文缩写，而是读者愿意转发到朋友圈的“社交货币”，必须给他们一个转发的理由！",
      "",
      "=== 封面配图建议（coverSuggestion） ===",
      "请额外输出 1 条具体的【公众号封面取材实操建议】，尺寸比例参考：900×383px。",
      "封面第一原则是证据链，不是设计感：真实截图/实拍/过程记录 > 精致海报。请优先建议用户补一张能证明正文观点的真实材料。",
      "coverSuggestion 必须写成一段具体、可执行的取材说明，并覆盖以下要素：",
      "1. 真人元素：优先判断能否加入真人露出，例如作者在工作台前的实拍、手持关键文件/工牌/纸质记录、带真实头像或身份痕迹的场景照；真人露出比纯数据截图更能积累 IP 信任。",
      "2. 视觉锤复用原则：如果正文属于账号核心系列内容，优先建议沿用已经验证过的固定封面、固定真人照片或固定截图模板，只替换局部数据、红框或痛点小标签；封面的稳定 = 信任的稳定。",
      "3. 证据主体：如果没有合适真人元素，再推荐聊天截图、后台数据截图、手机界面截图、手写便签、工作台实拍、过程记录、真实物件或对标文章截图，说明它证明了正文里的哪一个判断。",
      "4. 真实处理：允许裁切、打码、红框圈重点、提高亮度，但保留原始粗糙感；粗糙但必须高清，证据主体里的数据和文字必须干净、可辨认；不要磨皮、不要精修、不要做成商业海报。",
      "5. 点击焦点：必须直接呼应文章标题里的利益点或痛点，用 1 秒内能刺激冲动型点击欲的极端数据、反差画面或刺痛表达做焦点，例如亏损数字、入账记录、失败记录、扎心对话、明显前后对比。",
      "6. 标题关系：如果原图信息已经足够强，不要额外加大字；如果必须加字，只加 4-8 个字的小标签，不能压过证据本身；如果文章偏观点或情感类，可建议使用纯白底黑字或手写便签的极简金句封面。",
      "7. 禁忌项：不要推荐生图，不要伪造聊天记录/后台数据/客户反馈，不要过度科技感，不要空泛插画，不要为了好看牺牲可信度。",
    ].join("\n"),
    outputSchema: metaResponseSchema,
  };
}
