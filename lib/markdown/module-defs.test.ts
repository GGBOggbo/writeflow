import { describe, expect, it } from "vitest";
import {
  ADVANCED_MODULE_NAMES,
  MODULE_DEFS,
  formatAdvancedModuleContracts,
  formatAdvancedModuleUsages,
  isLegacyAdvancedModuleName,
  isWriteflowModuleName,
} from "./module-defs";

describe("MODULE_DEFS", () => {
  it("defines one contract for every supported advanced module", () => {
    expect(ADVANCED_MODULE_NAMES).toHaveLength(55);
    expect(Object.keys(MODULE_DEFS).sort()).toEqual(
      [...ADVANCED_MODULE_NAMES].sort()
    );
  });

  it("exposes Writeflow-owned wf modules without removing legacy modules", () => {
    expect(ADVANCED_MODULE_NAMES).toContain("wf-section");
    expect(ADVANCED_MODULE_NAMES).toContain("wf-pullquote");
    expect(ADVANCED_MODULE_NAMES).toContain("hero");
    expect(isWriteflowModuleName("wf-points")).toBe(true);
    expect(isWriteflowModuleName("cards")).toBe(false);
    expect(isLegacyAdvancedModuleName("cards")).toBe(true);
    expect(isLegacyAdvancedModuleName("wf-points")).toBe(false);
  });

  it("documents wf modules as reading rhythm modules", () => {
    const usages = formatAdvancedModuleUsages();

    expect(usages).toContain("wf-section");
    expect(usages).toContain("阅读节奏");
    expect(usages).not.toContain("brand: md2wechat");
    expect(MODULE_DEFS["wf-steps"]).toMatchObject({
      kind: "rows",
      columns: ["index", "heading", "body"],
      requiredColumns: 3,
    });
  });

  it("describes required, optional, and repeatable field modules", () => {
    expect(MODULE_DEFS.verdict).toEqual({
      usage: "关键结论或转折处的强判断卡片，用于把核心观点压实。",
      kind: "fields",
      required: ["title", "body"],
      optional: ["eyebrow"],
      constraints: {
        maxChars: {
          title: 48,
          body: 180,
        },
      },
    });
    expect(MODULE_DEFS["image-annotate"]).toEqual({
      usage: "图片重点标注卡，用于解释已有图片中的关键区域。",
      kind: "fields",
      required: ["title", "image"],
      optional: ["eyebrow", "alt", "note"],
      repeated: [
        {
          key: "point",
          minCount: 1,
          columns: ["index", "x", "y", "heading", "body"],
          requiredColumns: 5,
          maxColumns: 5,
        },
      ],
    });
  });

  it("describes ordered row contracts without making optional tone columns mandatory", () => {
    expect(MODULE_DEFS.cards).toEqual({
      usage: "并列要点卡片，用于呈现 2 个以上平级观点、步骤或理由。",
      kind: "rows",
      columns: ["index", "heading", "body", "tone"],
      requiredColumns: 3,
      maxColumns: 4,
      minRows: 1,
    });
    expect(MODULE_DEFS.faq).toEqual({
      usage: "问答卡，用于承接读者可能产生的具体疑问。",
      kind: "rows",
      columns: ["question", "answer"],
      requiredColumns: 2,
      maxColumns: 2,
      minRows: 1,
    });
  });

  it("describes Markdown-image and dialogue bodies", () => {
    expect(MODULE_DEFS.gallery).toEqual({
      usage: "图片组卡，用于展示原文已有的多张相关图片。",
      kind: "markdown-images",
      minImages: 1,
    });
    expect(MODULE_DEFS.longimage).toEqual({
      usage: "长图卡，用于展示原文已有的一张长图或流程图。",
      kind: "markdown-images",
      minImages: 1,
      maxImages: 1,
    });
    expect(MODULE_DEFS.dialogue).toEqual({
      usage: "对话卡，用于呈现两方以上的问答、讨论或模拟对话。",
      kind: "dialogue",
      minLines: 2,
    });
  });

  it("formats compact prompt contracts from the same definitions", () => {
    const contracts = formatAdvancedModuleContracts();

    expect(contracts).toContain(
      "verdict｜关键结论或转折处的强判断卡片，用于把核心观点压实。｜字段型｜必填 title, body｜可选 eyebrow"
    );
    expect(contracts).toContain(
      "cards｜并列要点卡片，用于呈现 2 个以上平级观点、步骤或理由。｜行型｜每行 index | heading | body | tone?｜至少 1 行"
    );
    expect(contracts).toContain(
      "gallery｜图片组卡，用于展示原文已有的多张相关图片。｜图片正文型｜至少 1 张 Markdown 图片"
    );
    expect(contracts).toContain(
      "dialogue｜对话卡，用于呈现两方以上的问答、讨论或模拟对话。｜对话型｜至少 2 行“角色: 内容”"
    );
    expect(contracts.split("\n")).toHaveLength(55);
  });
});
