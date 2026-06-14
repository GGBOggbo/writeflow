import type { FormatDraftInput } from "@/types/ai";
import type { FormatDraftProviderOptions } from "../provider";
import {
  formatDraftClassificationSchema,
  splitDraftSegments,
} from "@/lib/formatting/classification";

export function buildFormatDraftPrompt(
  input: FormatDraftInput,
  options?: FormatDraftProviderOptions
) {
  const segments = splitDraftSegments(input.content);
  const retryFeedback = options?.qualityFeedback
    ? [
        "",
        "=== 上一次识别质量不足 ===",
        options.qualityFeedback,
        "请重新通读全文，重点识别原文中真实存在的情绪高点、核心判断、痛点、转折停顿和结尾互动。",
        "不要为了增加样式而乱标，也不能添加原文不存在的标题。",
      ]
    : [];

  return {
    systemPrompt: [
      "你是公众号正文的语义标注器，不是作者，也不是排版设计师。",
      "你的唯一任务是判断每个已编号正文段落的语义类型。",
      "只返回合法 JSON，不输出解释。",
    ].join("\n"),
    userPrompt: [
      "正文版本 ID：" + input.draftVersionId,
      "",
      "=== 语义类型 ===",
      "paragraph：普通叙述段落。",
      "  ⚠️ 标注前必须反向自检：情绪爆点、结论、反问、停顿、纠正误区、作者立场都不是 paragraph，要按真实角色归类。长文里连续 paragraph 是最大的失败模式，逐行机械输出 paragraph 等于没识别。",
      "heading：章节标题",
      "quote：核心判断或金句（能被单独摘抄的洞见）。",
      "  避：普通叙述不要标；情绪爆点和反问不算金句；不要为了丰富样式把普通句硬拔成 quote。",
      "  避：金句是稀缺重点，全文控制在 5-7 个以内；普通有道理的话不是金句，不要为了强调而多标。",
      "pain：痛点、风险或警示（指出读者真实的损失或危险）。",
      "  避：作者立场不是痛点；只是纠正某个误区时按更准确的角色判断；普通提醒不要硬拔成 pain。",
      "transition：转折、停顿或分隔（叙事节奏的断点）。",
      "  避：上下文逻辑连贯时不要加；普通段落之间的自然衔接不算 transition。",
      "  避：转折/停顿只用于真正的章节转场或叙事断点，全文 4-6 个以内；普通的短句（如\"没有新消息\"\"就坐着\"）按 paragraph 或 quote 处理，不要做成居中分隔块。",
      "list：连续短列表",
      "comparison：明确的对比内容",
      "cta：结尾行动号召或互动提问。",
      "  避：全文最多 1 个 cta，必须是结尾最后那段最明确的行动号召；正文中间的号召、提问、引导不要标 cta（按 transition 或 paragraph 处理）。",
      "",
      "=== 绝对边界 ===",
      "1. 原文必须逐字保留，不得改写；只返回每段的编号和类型，不要回传正文文本。",
      "2. 每个编号必须且只能出现一次，不得遗漏、重复或添加编号。",
      "3. 只能做语义分类，不得输出 HTML，不得输出 CSS，不得添加视觉说明。",
      "4. heading 只能标记原文真实存在的章节标题，不能添加原文不存在的标题。",
      "5. 短句不等于普通段落：情绪爆点、结论、反问和停顿应按真实角色分类。",
      "6. 长文必须先通读叙事弧线，再识别金句、痛点、转折和结尾，不能逐行机械输出 paragraph。",
      "7. 不确定类型时使用 paragraph，不要为了丰富样式强行标注。",
      "8. 【首屏克制】文章前 2-3 个自然段保持 paragraph，先建立叙事，不要一开头就用 pain/quote/transition 打断；等第一个核心判断出现时再用强调样式。",
      ...retryFeedback,
      "",
      "=== 待标注正文 ===",
      ...segments.map((segment, index) => `[${index}] ${segment}`),
    ].join("\n"),
    outputSchema: formatDraftClassificationSchema,
  };
}
