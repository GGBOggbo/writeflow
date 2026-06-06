import type { GenerateDraftInput } from "@/types/ai";
import { draftResponseSchema } from "../schemas";
import { WRITING_SYSTEM_PROMPT } from "./system";

function formatBenchmarkSummaries(input: GenerateDraftInput) {
  if (!input.searchEnabled || !input.searchContext) {
    return "";
  }

  const summaries = input.searchContext.results
    .filter((result) => result.benchmarkSummary)
    .slice(0, 2)
    .map((result, index) => {
      const summary = result.benchmarkSummary;

      if (!summary) return "";

      return [
        `对标 ${index + 1}: ${result.title}`,
        `   - 用户真实卡点：${summary.userPain}`,
        `   - 可学结构：${summary.structurePattern}`,
        `   - 排版/语气节奏：${summary.rhythmNotes}`,
        `   - 评论区洞察：${summary.commentInsights.join(" / ")}`,
        `   - 可复用切入角度：${summary.reusableAngles.join(" / ")}`,
        `   - 不要照搬：${summary.avoidCopying.join(" / ")}`,
      ].join("\n");
    })
    .filter(Boolean);

  if (summaries.length === 0) {
    return "";
  }

  return [
    "",
    "=== AI 对标拆解摘要（正文必须吸收，不可照搬） ===",
    ...summaries,
  ].join("\n");
}

export function buildDraftPrompt(input: GenerateDraftInput) {
  const outlineSummary = input.outline
    .map(
      (section, index) =>
        `模块 ${index + 1}: ${section.heading}\n` +
        `   - 节点角色：${section.sectionRole}\n` +
        `   - 核心观点：${section.corePoint}\n` +
        `   - 支撑建议：${section.supportSuggestion}`
    )
    .join("\n");

  const materialSummary =
    input.materialSlots.length > 0
      ? input.materialSlots
          .map(
            (slot, index) =>
              `槽位 ${index + 1}: [绑定节点 ${slot.targetOutlineId}${slot.placement ? ` / ${slot.placement}` : ""}] 需要补充 -> ${slot.content} (用途: ${slot.purpose})`
          )
          .join("\n")
      : "当前没有额外素材槽位。";
  const benchmarkSummary = formatBenchmarkSummaries(input);

  return {
    systemPrompt: WRITING_SYSTEM_PROMPT,
    userPrompt: [
      "你现在的角色是公众号爆款文章的最高效组装工。",
      "你的任务是把用户确认的创作思路、文章骨架和真实素材需求，组装成一篇高质量、高转化、极具人味的公众号正文初稿。",
      `选题 ID：${input.topicId}`,
      `方向标签：${input.topicLabel}`,
      `选题角度：${input.topicAngle}`,
      `核心观点：${input.coreViewpoint}`,
      `初步受众：${input.targetAudience}`,
      `推荐理由：${input.reason}`,
      `文章体裁：${input.structureType}`,
      `写作目标：${input.briefObjective}`,
      `目标读者：${input.briefAudience}`,
      `IP 人设：${input.briefPersona}`,
      `语气要求：${input.briefTone}`,
      `商业落脚点：${input.briefDropOffPoint}`,
      `写作约束：${input.briefConstraints.join(" / ")}`,
      "",
      "=== 文章骨架（严格按此推进） ===",
      outlineSummary,
      "",
      "=== 需预留的真实素材槽位 ===",
      materialSummary,
      benchmarkSummary,
      "",
      "=== 正文组装铁律（必须绝对遵守） ===",
      "1. 【一次成型】请全力以赴生成 1 篇完整初稿，并将它放进 drafts 数组中返回。不要生成两篇对比稿。",
      "2. 【内容长度】正文控制在 800-1500 字左右，确保内容足够丰满，但不要拖沓。",
      "3. 【行文节奏与排版】严格遵守高频换行原则，尽量做到一两句话就另起一段，适合手机端阅读，绝对不要写成大段文字墙。",
      "4. 【人设一致】全文必须像上方这个 IP 人设真的在说话，允许有判断、有温度、有踩坑后的经验感，但不能端着讲大道理。",
      "5. 【拒绝 AI 过渡词】禁止使用“首先、其次、然而、综上所述”等生硬连接词，用自然口语、提问、场景和判断来推进。",
      "6. 【槽位高亮标记】当写到需要补充素材的地方时，严禁自己编造虚假经历、客户案例或数据。你必须用严格格式占位：【💡需要你补充：这里写明需要用户补什么】。",
      "7. 【商业闭环收尾】文章最后几段必须自然过渡到商业落脚点，引导读者记住核心判断，或产生下一步行动与互动意愿。",
      "8. 【对标吸收】如果上方有 AI 对标拆解摘要，请只吸收用户卡点、结构节奏和评论洞察，严禁照搬原文句子、故事、数据或作者身份。",
      "9. 【格式净化】不要输出 Markdown 标题语法、列表、代码块或 JSON 之外的解释，只输出符合 schema 的纯净正文内容。",
      "",
      "请只围绕这个已选选题输出正文，不要偏离这个选题，不要改写成其他主题。",
    ].join("\n"),
    outputSchema: draftResponseSchema,
  };
}
