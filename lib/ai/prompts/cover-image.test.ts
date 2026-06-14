import { describe, expect, it } from "vitest";
import { buildCoverImagePrompt } from "./cover-image";
import type { CoverImageConcept } from "@/types/ai";

const baseConcept: CoverImageConcept = {
  visualConcept: "清晨空办公室，亮屏笔记本旁散落便签与咖啡杯",
  mood: "冷调晨光，低饱和，胶片质感",
  focalObject: "笔记本屏幕",
  palette: "墨黑 + 暖纸米色 + 一点静默蓝绿",
  titleOverlay: "none",
};

describe("buildCoverImagePrompt", () => {
  it("always carries ratio, mood, palette and the fixed forbidden block", () => {
    const p = buildCoverImagePrompt({ ...baseConcept });
    expect(p).toContain("900×383");
    expect(p).toContain("氛围光优先");
    expect(p).toContain("禁止高饱和堆色");
    expect(p).toContain("假数据截图");
    expect(p).toContain("水印");
    expect(p).toContain("多手指");
  });

  it("titleOverlay=none omits overlay spec and quiet-zone constraint", () => {
    const p = buildCoverImagePrompt({ ...baseConcept, titleOverlay: "none" });
    expect(p).toContain("无压字");
    expect(p).not.toContain("安静区");
  });

  it("titleOverlay=title emits title spec with paper-cream color + left quiet zone", () => {
    const p = buildCoverImagePrompt({ ...baseConcept, titleOverlay: "title" });
    expect(p).toContain("标题压字规范");
    expect(p).toContain("#f5f1e8");
    expect(p).toContain("字重 400-500");
    expect(p).toContain("左侧留 ≥35% 低细节安静区");
  });

  it("titleOverlay=tag emits tag spec without full title line", () => {
    const p = buildCoverImagePrompt({ ...baseConcept, titleOverlay: "tag" });
    expect(p).toContain("小标签规范");
    expect(p).toContain("#f5f1e8");
    expect(p).not.toContain("标题压字规范");
  });

  it("includes customNegatives when provided", () => {
    const p = buildCoverImagePrompt({
      ...baseConcept,
      customNegatives: "不要出现品牌 logo、不要红色",
    });
    expect(p).toContain("概念专属禁忌：不要出现品牌 logo、不要红色");
  });

  it("falls back to a usable generic prompt when concept is undefined", () => {
    const p = buildCoverImagePrompt(undefined);
    expect(p).toContain("900×383");
    expect(p).toContain("画面概念：");
    expect(p).toContain("假数据截图");
    expect(p).not.toContain("undefined");
    expect(p).not.toContain("[object");
  });
});
