import type { CoverImageConcept } from "@/types/ai";

const FORBIDDEN = [
  "不要装饰性光斑 / bokeh / blob / 贴纸 / 无意义圆形",
  "不要假数据截图、假 UI、假聊天记录、假后台",
  "不要把文字、logo、水印、二维码、签名渲进图里",
  "不要多手指、变形文字、不自然光照、超现实拼接",
  "不要 stock-photo 式刻板微笑 / 摆拍",
].join("\n");

const FALLBACK_CONCEPT: CoverImageConcept = {
  visualConcept: "与正文核心观点呼应的氛围画面，单一清晰主体",
  mood: "克制氛围光，低饱和",
  focalObject: "一个完整、可辨认的主体",
  palette: "墨黑 + 暖纸米色 + 一点静默点缀色",
  titleOverlay: "none",
};

/**
 * 把模型的创意概念套进写死的 guizang 构图模板，产出公众号 900×383 封面的生图 prompt。
 * 概念是变量(模型填)，骨架是常量(代码写死)。concept 缺失时用通用 fallback，绝不抛错。
 */
export function buildCoverImagePrompt(concept?: CoverImageConcept): string {
  const c = concept ?? FALLBACK_CONCEPT;

  const quietZoneLine =
    c.titleOverlay !== "none"
      ? "构图：宽幅横向构图；画面左侧留 ≥35% 低细节安静区供压字，主体偏向右侧。"
      : "构图：宽幅横向构图；主体可居中或偏一侧，无压字约束。";

  const overlayLine =
    c.titleOverlay === "title"
      ? "标题压字规范：落画面左侧安静区，4-8 字，纸米色 #f5f1e8（非纯白），字重 400-500，左对齐，不压焦点主体。"
      : c.titleOverlay === "tag"
        ? "小标签规范：角标 4-8 字，纸米色 #f5f1e8，字重 400-500，不压焦点主体。"
        : "无压字：标题走公众号标题字段，图内不渲文字。";

  const lines = [
    "【公众号封面 · 900×383 (2.35:1)】",
    `画面概念：${c.visualConcept}`,
    `情绪光线：${c.mood}；氛围光优先，拒绝正午高反差 / 闪光灯 / 游客照质感。`,
    `焦点主体：${c.focalObject}（必须完整入镜，不可裁切、不被文字遮挡）。`,
    `配色：克制——${c.palette}；禁止高饱和堆色、禁止彩虹渐变。`,
    quietZoneLine,
    "人物：不强制出现（按概念判断，可无人）。",
    overlayLine,
    "",
    "禁忌（硬性）：",
    FORBIDDEN,
  ];

  if (c.customNegatives) {
    lines.push(`概念专属禁忌：${c.customNegatives}`);
  }

  return lines.join("\n");
}
