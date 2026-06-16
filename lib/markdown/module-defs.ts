export const ADVANCED_MODULE_NAMES = [
  "hero",
  "cards",
  "metrics",
  "infographic",
  "audience-fit",
  "verdict",
  "people",
  "cases",
  "pricing",
  "faq",
  "logos",
  "part",
  "label-title",
  "quote",
  "image-text",
  "image-compare",
  "image-annotate",
  "toc",
  "checklist",
  "toolbox",
  "specs",
  "image-steps",
  "notice",
  "gallery",
  "longimage",
  "dialogue",
  "summary",
  "author-card",
  "series",
  "subscribe",
  "cta",
] as const;

export type AdvancedModuleName = (typeof ADVANCED_MODULE_NAMES)[number];

type RepeatedField = {
  key: string;
  minCount: number;
  columns?: readonly string[];
  requiredColumns?: number;
  maxColumns?: number;
};

export type FieldModuleDef = {
  usage: string;
  kind: "fields";
  required: readonly string[];
  optional: readonly string[];
  repeated?: readonly RepeatedField[];
  constraints?: {
    maxChars?: Readonly<Record<string, number>>;
    distinctFields?: readonly (readonly [string, string])[];
  };
};

export type RowModuleDef = {
  usage: string;
  kind: "rows";
  columns: readonly string[];
  requiredColumns: number;
  maxColumns: number;
  minRows: number;
};

export type MarkdownImagesModuleDef = {
  usage: string;
  kind: "markdown-images";
  minImages: number;
  maxImages?: number;
};

export type DialogueModuleDef = {
  usage: string;
  kind: "dialogue";
  minLines: number;
};

export type AdvancedModuleDef =
  | FieldModuleDef
  | RowModuleDef
  | MarkdownImagesModuleDef
  | DialogueModuleDef;

export const MODULE_DEFS = {
  hero: {
    usage: "文章开场主视觉卡，用于开篇点题、抛出核心观点或系列气质。",
    kind: "fields",
    required: ["title"],
    optional: [
      "eyebrow",
      "kicker",
      "subtitle",
      "tags",
      "meta",
      "brand",
      "image",
    ],
  },
  cards: {
    usage: "并列要点卡片，用于呈现 2 个以上平级观点、步骤或理由。",
    kind: "rows",
    columns: ["index", "heading", "body", "tone"],
    requiredColumns: 3,
    maxColumns: 4,
    minRows: 1,
  },
  metrics: {
    usage: "关键数据卡，用于展示原文已有指标、数量、涨幅或结果。",
    kind: "rows",
    columns: ["label", "value", "description", "tone"],
    requiredColumns: 3,
    maxColumns: 4,
    minRows: 1,
  },
  infographic: {
    usage: "信息图式判断卡，用于把一句核心判断或流程关系前置放大。",
    kind: "fields",
    required: ["title"],
    optional: ["type", "eyebrow", "subtitle", "quote", "note"],
  },
  "audience-fit": {
    usage: "适合人群卡，用于说明谁适合、谁不适合这套观点或方案。",
    kind: "fields",
    required: ["fit"],
    optional: ["title", "avoid"],
  },
  verdict: {
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
  },
  people: {
    usage: "人物或角色卡，用于介绍原文已有角色、身份和分工。",
    kind: "rows",
    columns: ["name", "role", "body", "tone"],
    requiredColumns: 3,
    maxColumns: 4,
    minRows: 1,
  },
  cases: {
    usage: "案例结果卡，用于展示原文已有案例、成果和复盘要点。",
    kind: "rows",
    columns: ["name", "result", "body", "tone"],
    requiredColumns: 3,
    maxColumns: 4,
    minRows: 1,
  },
  pricing: {
    usage: "方案价格卡，用于展示原文已有套餐、价格和权益。",
    kind: "rows",
    columns: ["name", "price", "features", "tone"],
    requiredColumns: 3,
    maxColumns: 4,
    minRows: 1,
  },
  faq: {
    usage: "问答卡，用于承接读者可能产生的具体疑问。",
    kind: "rows",
    columns: ["question", "answer"],
    requiredColumns: 2,
    maxColumns: 2,
    minRows: 1,
  },
  logos: {
    usage: "品牌或对象墙，用于展示原文已有品牌、工具、客户或生态对象。",
    kind: "rows",
    columns: ["name", "description"],
    requiredColumns: 1,
    maxColumns: 2,
    minRows: 1,
  },
  part: {
    usage: "大章节切换卡，用于文章进入新的主要部分。",
    kind: "fields",
    required: ["index", "title"],
    optional: ["subtitle"],
  },
  "label-title": {
    usage: "标签标题卡，用于突出一个小节主题或重要提示。",
    kind: "fields",
    required: ["title"],
    optional: ["label"],
  },
  quote: {
    usage: "金句引用卡，用于强调一句值得停顿的核心表达。",
    kind: "fields",
    required: ["quote"],
    optional: ["eyebrow", "source", "note"],
  },
  "image-text": {
    usage: "图文说明卡，用于把已有图片和解释文字绑定在一起。",
    kind: "fields",
    required: ["title", "image"],
    optional: ["layout", "eyebrow", "body", "alt", "note"],
  },
  "image-compare": {
    usage: "前后对比图卡，用于展示原文已有的两张对照图片。",
    kind: "fields",
    required: [
      "title",
      "left_title",
      "left_image",
      "right_title",
      "right_image",
    ],
    optional: ["eyebrow", "note"],
  },
  "image-annotate": {
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
  },
  toc: {
    usage: "阅读导航卡，用于长文开头列出阅读路径或目录。",
    kind: "rows",
    columns: ["index", "heading", "body"],
    requiredColumns: 2,
    maxColumns: 3,
    minRows: 1,
  },
  checklist: {
    usage: "检查清单卡，用于呈现步骤状态、发布检查或行动清单。",
    kind: "rows",
    columns: ["state", "heading", "body"],
    requiredColumns: 2,
    maxColumns: 3,
    minRows: 1,
  },
  toolbox: {
    usage: "工具资源卡，用于整理原文已有工具、链接或资料。",
    kind: "rows",
    columns: ["type", "heading", "body", "url"],
    requiredColumns: 3,
    maxColumns: 4,
    minRows: 1,
  },
  specs: {
    usage: "参数规格卡，用于展示对象、配置、条件等结构化信息。",
    kind: "rows",
    columns: ["label", "value", "note"],
    requiredColumns: 2,
    maxColumns: 3,
    minRows: 1,
  },
  "image-steps": {
    usage: "图文步骤卡，用于展示带截图或配图的操作流程。",
    kind: "rows",
    columns: ["index", "heading", "body", "image", "alt"],
    requiredColumns: 3,
    maxColumns: 5,
    minRows: 1,
  },
  notice: {
    usage: "提示说明卡，用于强调风险、注意事项或边界条件。",
    kind: "rows",
    columns: ["label", "heading", "body"],
    requiredColumns: 2,
    maxColumns: 3,
    minRows: 1,
  },
  gallery: {
    usage: "图片组卡，用于展示原文已有的多张相关图片。",
    kind: "markdown-images",
    minImages: 1,
  },
  longimage: {
    usage: "长图卡，用于展示原文已有的一张长图或流程图。",
    kind: "markdown-images",
    minImages: 1,
    maxImages: 1,
  },
  dialogue: {
    usage: "对话卡，用于呈现两方以上的问答、讨论或模拟对话。",
    kind: "dialogue",
    minLines: 2,
  },
  summary: {
    usage: "总结高亮卡，用于收束一段内容或提炼阶段结论。",
    kind: "fields",
    required: ["highlight", "body"],
    optional: ["eyebrow"],
  },
  "author-card": {
    usage: "作者介绍卡，用于展示原文已有作者身份、简介和链接。",
    kind: "fields",
    required: ["name", "role", "bio"],
    optional: ["tags", "note", "link"],
  },
  series: {
    usage: "系列文章卡，用于说明文章所属系列和下一篇预告。",
    kind: "fields",
    required: ["name", "title"],
    optional: ["issue", "desc", "tags", "next"],
  },
  subscribe: {
    usage: "关注订阅卡，用于文末引导读者持续关注。",
    kind: "fields",
    required: ["title", "primary"],
    optional: ["label", "subtitle", "secondary", "note"],
  },
  cta: {
    usage: "行动号召卡，用于文末给出唯一明确的下一步行动。",
    kind: "fields",
    required: ["title"],
    optional: ["note"],
    constraints: {
      maxChars: {
        title: 52,
        note: 80,
      },
      distinctFields: [["title", "note"]],
    },
  },
} as const satisfies Record<AdvancedModuleName, AdvancedModuleDef>;

const MODULE_NAME_SET = new Set<string>(ADVANCED_MODULE_NAMES);

export function isAdvancedModuleName(
  value: string
): value is AdvancedModuleName {
  return MODULE_NAME_SET.has(value);
}

export function formatAdvancedModuleContracts() {
  return ADVANCED_MODULE_NAMES.map((name) => {
    const definition = MODULE_DEFS[name];

    if (definition.kind === "fields") {
      const repeated =
        "repeated" in definition ? definition.repeated : undefined;
      const parts = [
        `${name}｜${definition.usage}｜字段型`,
        `必填 ${definition.required.join(", ")}`,
      ];
      if (definition.optional.length > 0) {
        parts.push(`可选 ${definition.optional.join(", ")}`);
      }
      if (repeated?.length) {
        parts.push(
          `可重复 ${repeated
            .map(({ key, minCount, columns }) =>
              columns
                ? `${key}(至少 ${minCount} 次，每次 ${columns.join(" | ")})`
                : `${key}(至少 ${minCount} 次)`
            )
            .join(", ")}`
        );
      }
      return parts.join("｜");
    }

    if (definition.kind === "rows") {
      const columns = definition.columns
        .map((column, index) =>
          index < definition.requiredColumns ? column : `${column}?`
        )
        .join(" | ");
      return `${name}｜${definition.usage}｜行型｜每行 ${columns}｜至少 ${definition.minRows} 行`;
    }

    if (definition.kind === "markdown-images") {
      const maxImages =
        "maxImages" in definition ? definition.maxImages : undefined;
      const maximum =
        maxImages === undefined
          ? ""
          : `，最多 ${maxImages} 张`;
      return `${name}｜${definition.usage}｜图片正文型｜至少 ${definition.minImages} 张 Markdown 图片${maximum}`;
    }

    return `${name}｜${definition.usage}｜对话型｜至少 ${definition.minLines} 行“角色: 内容”`;
  }).join("\n");
}

const HIGH_FREQUENCY_MODULES = new Set([
  "hero",
  "verdict",
  "cta",
  "summary",
  "quote",
  "cards",
  "notice",
]);

export function formatAdvancedModuleUsages() {
  return ADVANCED_MODULE_NAMES.map((name) => {
    const definition = MODULE_DEFS[name];
    const kind =
      definition.kind === "fields"
        ? "字段型"
        : definition.kind === "rows"
          ? "行型"
          : definition.kind === "markdown-images"
            ? "图片型"
            : "对话型";

    // 高频核心模块附带必填字段提示，避免 AI 凭感觉填错字段触发重试；
    // 低频模块字段细节交给 validator 在出错时反馈。
    if (HIGH_FREQUENCY_MODULES.has(name)) {
      if (definition.kind === "fields") {
        return `${name}（${kind}）｜${definition.usage}｜必填 ${definition.required.join(", ")}`;
      }
      if (definition.kind === "rows") {
        const requiredCols = definition.columns
          .slice(0, definition.requiredColumns)
          .join(" | ");
        return `${name}（${kind}）｜${definition.usage}｜每行 ${requiredCols}`;
      }
    }
    return `${name}（${kind}）｜${definition.usage}`;
  }).join("\n");
}
