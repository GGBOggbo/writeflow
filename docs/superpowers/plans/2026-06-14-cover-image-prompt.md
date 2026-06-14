# 封面生图提示词 (Cover Image Prompt) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 meta 阶段新增一条 AI 生图 prompt 产出(`coverImagePrompt`),借鉴 guizang 的确定性封面构图规则,模型只出创意概念、代码套模板。

**Architecture:** 概念 + 模板(方案 A)。模型在现有 meta 调用里多吐一个 optional `coverImageConcept`;service 层用纯函数 `buildCoverImagePrompt(concept)` 把概念套进写死的 guizang 构图骨架(比例/安静区/光线/配色/禁忌),产出最终 prompt 字符串,随 workflow 持久化并在 UI 显示。与现有证据优先的 `coverSuggestion` 并存为独立轨道。

**Tech Stack:** TypeScript、Next.js(modified)、zod、vitest。测试 `npm test`(vitest run),lint `npm run lint`,类型检查 `npx tsc --noEmit`。

**Spec:** [docs/superpowers/specs/2026-06-14-cover-image-prompt-design.md](../specs/2026-06-14-cover-image-prompt-design.md)

---

## 文件结构

| 文件 | 责任 | 动作 |
|---|---|---|
| `types/ai.ts` | `CoverImageConcept` 类型;`GenerateTitlesAndSummariesOutput` 加 `coverImagePrompt` | 改 |
| `lib/ai/prompts/cover-image.ts` | 纯函数 `buildCoverImagePrompt(concept)` + fallback | 新建 |
| `lib/ai/prompts/cover-image.test.ts` | 模板分支测试 | 新建 |
| `lib/ai/schemas.ts` | `coverImageConceptSchema`;`metaResponseSchema` 加 optional 字段 | 改 |
| `lib/ai/schemas.test.ts` | 概念字段 optional 行为测试 | 改 |
| `lib/ai/service.ts` | `generateTitlesAndSummaries` 组装 prompt | 改 |
| `lib/ai/service.test.ts` | 真实 provider 路径组装验证 | 改 |
| `lib/ai/prompts/meta.ts` | 概念指令块 | 改 |
| `lib/ai/prompts/meta.test.ts` | 指令块断言 | 改 |
| `lib/ai/real-provider.ts` | meta `jsonHint` 加概念字段 | 改 |
| `lib/ai/mock-provider.ts` | mock 返回样例概念 | 改 |
| `lib/mock/generators.ts` | `generateMeta` 返回类型对齐 | 改 |
| `types/workflow.ts` | `WorkflowState` + `meta_generated` 事件加 `coverImagePrompt` | 改 |
| `lib/state-machine.ts` | 3 处 baseState + reducer | 改 |
| `lib/state-machine.test.ts` | meta_generated 测试补全字段 + 断言 | 改 |
| `components/hooks/use-workflow.ts` | 派发 `coverImagePrompt` | 改 |
| `lib/storage/workflow-storage.ts` | 持久化 typeof 兜底读取 | 改 |
| `components/stages/meta-stage.tsx` | 显示卡片 | 改 |
| `components/stages/final-stage.tsx` | 显示卡片 | 改 |

**顺序原则:** 每个任务结束后代码可编译、测试全绿。先建独立纯函数(Task 1),再接 schema+类型+service(Task 2,三者同任务以满足类型),再 prompt/jsonHint/mock(Task 3-5),最后镜像客户端(Task 6-8)。

---

## Task 1: `CoverImageConcept` 类型 + `buildCoverImagePrompt` 纯函数(TDD,隔离)

**Files:**
- Modify: `types/ai.ts`(顶部加类型)
- Create: `lib/ai/prompts/cover-image.ts`
- Create: `lib/ai/prompts/cover-image.test.ts`

- [ ] **Step 1: 在 `types/ai.ts` 加 `CoverImageConcept` 类型**

在 `types/ai.ts` 顶部已有的类型之间(例如 `GenerateTitlesAndSummariesInput` 之前)加:

```ts
export type CoverImageConcept = {
  /** 画面画什么(场景/物件/隐喻),可不带人物 */
  visualConcept: string;
  /** 情绪 + 光线方向(氛围、时段、光质) */
  mood: string;
  /** 焦点主体(必须完整保留、不可裁切) */
  focalObject: string;
  /** 克制的 2-3 色基调 */
  palette: string;
  /** 标题是否压图 */
  titleOverlay: "none" | "tag" | "title";
  /** 概念专属的"不要"(可选) */
  customNegatives?: string;
};
```

- [ ] **Step 2: 先写失败测试 `lib/ai/prompts/cover-image.test.ts`**

```ts
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
```

- [ ] **Step 3: 跑测试确认失败**

Run: `npm test -- cover-image`
Expected: FAIL(`buildCoverImagePrompt` 未导出 / 模块不存在)

- [ ] **Step 4: 实现 `lib/ai/prompts/cover-image.ts`**

```ts
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
```

- [ ] **Step 5: 跑测试确认通过**

Run: `npm test -- cover-image`
Expected: PASS(6 个测试全过)

- [ ] **Step 6: 类型检查 + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 无错误(新文件独立,未接入其他模块)

- [ ] **Step 7: 提交**

```bash
git add types/ai.ts lib/ai/prompts/cover-image.ts lib/ai/prompts/cover-image.test.ts
git commit -m "feat(ai): add buildCoverImagePrompt template + CoverImageConcept type"
```

---

## Task 2: schema optional 字段 + 输出类型 + service 组装

**Files:**
- Modify: `lib/ai/schemas.ts`(加 `coverImageConceptSchema` + `metaResponseSchema` 字段)
- Modify: `lib/ai/schemas.test.ts`(加 optional 行为测试)
- Modify: `types/ai.ts`(`GenerateTitlesAndSummariesOutput` 加 `coverImagePrompt`)
- Modify: `lib/ai/service.ts`(组装)
- Modify: `lib/ai/service.test.ts`(mocked payload + 断言)

- [ ] **Step 1: 在 `lib/ai/schemas.ts` 加 schema + 字段**

在 `metaResponseSchema` 定义(约 L351)**之前**加:

```ts
export const coverImageConceptSchema = z.object({
  visualConcept: z.string().trim().min(1),
  mood: z.string().trim().min(1),
  focalObject: z.string().trim().min(1),
  palette: z.string().trim().min(1),
  titleOverlay: z.enum(["none", "tag", "title"]),
  customNegatives: z.string().trim().min(1).optional(),
});
```

把 `metaResponseSchema` 改为(加 `coverImageConcept` optional 字段):

```ts
export const metaResponseSchema = z.object({
  titles: z.array(metaCardSchema).length(5),
  summaries: z.array(metaCardSchema).length(3),
  coverSuggestion: z.string().trim().min(1),
  coverImageConcept: coverImageConceptSchema.optional(),
  searchStatus: searchStatusSchema,
});
```

- [ ] **Step 2: 在 `types/ai.ts` 的 `GenerateTitlesAndSummariesOutput` 加字段**

把该类型(约 L147)改为:

```ts
export type GenerateTitlesAndSummariesOutput = {
  titles: MetaCard[];
  summaries: MetaCard[];
  coverSuggestion: string;
  coverImagePrompt: string;
  searchStatus?: SearchBundleStatus;
};
```

- [ ] **Step 3: 在 `lib/ai/service.ts` 组装 prompt**

在文件顶部 import 区(约 L48 `formatSearchReference` 那行附近)加:

```ts
import { buildCoverImagePrompt } from "./prompts/cover-image";
```

把 `generateTitlesAndSummaries` 末尾的 return(约 L653)从:

```ts
  return metaResponseSchema.parse({
    ...providerResult,
    searchStatus: searchContext?.status,
  });
```

改为:

```ts
  const { coverImageConcept, ...rest } = metaResponseSchema.parse({
    ...providerResult,
    searchStatus: searchContext?.status,
  });
  const coverImagePrompt = buildCoverImagePrompt(coverImageConcept);
  return { ...rest, coverImagePrompt };
```

(解构丢弃 `coverImageConcept`,只把组装好的 `coverImagePrompt` 放进输出。)

- [ ] **Step 4: 在 `lib/ai/schemas.test.ts` 加 optional 行为测试**

在 `requires coverSuggestion in meta responses` 测试(约 L196)**之后**加。为避免重复 5 标题/3 摘要,先在 `describe` 块内顶部加一个 fixture,再写两个测试:

```ts
  const metaResponseBase = {
    titles: [
      { id: "title-1", label: "利益结果型", content: "标题 1" },
      { id: "title-2", label: "场景痛点型", content: "标题 2" },
      { id: "title-3", label: "反常识/认知冲突型", content: "标题 3" },
      { id: "title-4", label: "新机会趋势型", content: "标题 4" },
      { id: "title-5", label: "个人故事/实录型", content: "标题 5" },
    ],
    summaries: [
      { id: "summary-1", label: "痛点共鸣版", content: "摘要 1" },
      { id: "summary-2", label: "悬念反转版", content: "摘要 2" },
      { id: "summary-3", label: "专业克制版", content: "摘要 3" },
    ],
    coverSuggestion: "取材建议",
  };

  it("accepts coverImageConcept when present", () => {
    const parsed = metaResponseSchema.parse({
      ...metaResponseBase,
      coverImageConcept: {
        visualConcept: "清晨办公室",
        mood: "冷调晨光",
        focalObject: "笔记本屏幕",
        palette: "墨黑+暖纸",
        titleOverlay: "title",
      },
    });
    expect(parsed.coverImageConcept?.titleOverlay).toBe("title");
  });

  it("accepts meta response without coverImageConcept (optional)", () => {
    const parsed = metaResponseSchema.parse(metaResponseBase);
    expect(parsed.coverImageConcept).toBeUndefined();
  });
```

- [ ] **Step 5: 在 `lib/ai/service.test.ts` 的 meta mocked payload 加概念 + 断言**

在该测试(约 L2120 的 `content: JSON.stringify({...})`)里,`coverSuggestion` 字段(约 L2165)之后加:

```ts
                  coverImageConcept: {
                    visualConcept: "清晨空荡的办公室，亮屏笔记本与散落便签",
                    mood: "冷调晨光，低饱和",
                    focalObject: "笔记本屏幕",
                    palette: "墨黑 + 暖纸米色",
                    titleOverlay: "title",
                  },
```

在该测试末尾断言区(约 L2193 `expect(result.coverSuggestion)...` 之后)加:

```ts
    expect(result.coverImagePrompt).toContain("清晨空荡的办公室");
    expect(result.coverImagePrompt).toContain("#f5f1e8");
```

- [ ] **Step 6: 跑测试**

Run: `npm test -- schemas service`
Expected: schemas 两个新测试 PASS;service 的 meta 测试 PASS(组装链路打通)。

- [ ] **Step 7: 类型检查 + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 无错误

- [ ] **Step 8: 提交**

```bash
git add lib/ai/schemas.ts lib/ai/schemas.test.ts types/ai.ts lib/ai/service.ts lib/ai/service.test.ts
git commit -m "feat(ai): wire coverImageConcept schema + assemble coverImagePrompt in service"
```

---

## Task 3: meta prompt 概念指令块

**Files:**
- Modify: `lib/ai/prompts/meta.ts`(在 coverSuggestion 块后加指令)
- Modify: `lib/ai/prompts/meta.test.ts`(加断言)

- [ ] **Step 1: 在 `lib/ai/prompts/meta.ts` 加指令块**

在 `userPrompt` 数组里,`coverSuggestion` 指令块的最后一行(约 L86 `"7. 禁忌项：..."`)**之后、数组结束 `].join("\n")`** 之前加:

```ts
      "",
      "=== 封面生图概念（coverImageConcept，可选） ===",
      "除上面的取材建议外，额外输出一个用于 AI 生图的封面视觉概念对象 coverImageConcept，供没有真实素材时生成公众号封面（900×383）。",
      "它与上面的证据链取材建议是两套独立产出：取材建议给能拍到真实素材的人，coverImageConcept 给需要 AI 生图的人。不要互相替代。",
      "coverImageConcept 覆盖以下字段：",
      "1. visualConcept：画面画什么（场景/物件/隐喻），可不带人物——不强制出现真人。",
      "2. mood：情绪与光线方向（氛围、时段、光质）。优先氛围光、低饱和，拒绝正午高反差/闪光灯/游客照质感。",
      "3. focalObject：焦点主体（必须完整保留、不可裁切的那个对象）。",
      "4. palette：克制的 2-3 色基调，禁高饱和堆色、禁彩虹渐变。",
      "5. titleOverlay：标题是否压图，三选一——none（图内无字，标题走公众号标题字段）/ tag（只压一个 4-8 字角标）/ title（左侧压短标题）。按内容判断：纯观点情感类可用 title 或 tag，强证据截图类用 none。",
      "6. customNegatives（可选）：这个概念专属要避免的东西（如不要出现某品牌 logo、不要红色）。",
      "不要在概念里伪造数据、不要描述带文字/logo/水印的画面。",
```

- [ ] **Step 2: 在 `lib/ai/prompts/meta.test.ts` 加断言**

在第一个测试(`anchors meta generation...`,约 L5-71)里,现有 coverSuggestion 断言群(约 L35-50)之后加:

```ts
    expect(prompt.userPrompt).toContain("封面生图概念");
    expect(prompt.userPrompt).toContain("coverImageConcept");
    expect(prompt.userPrompt).toContain("可不带人物");
    expect(prompt.userPrompt).toContain("titleOverlay");
    expect(prompt.userPrompt).toContain("customNegatives");
```

- [ ] **Step 3: 跑测试**

Run: `npm test -- prompts/meta`
Expected: PASS

- [ ] **Step 4: lint**

Run: `npm run lint`
Expected: 无错误

- [ ] **Step 5: 提交**

```bash
git add lib/ai/prompts/meta.ts lib/ai/prompts/meta.test.ts
git commit -m "feat(ai): instruct meta prompt to emit coverImageConcept"
```

---

## Task 4: real-provider `jsonHint` 加概念字段

**Files:**
- Modify: `lib/ai/real-provider.ts`(meta jsonHint 字符串,约 L209-210)
- Modify: `lib/ai/service.test.ts`(断言 fetch body 含 coverImageConcept)

- [ ] **Step 1: 改 `lib/ai/real-provider.ts` 的 meta jsonHint**

把 `generateTitlesAndSummaries` 配置对象里的 `jsonHint`(约 L209-210)整段替换为(在 `coverSuggestion` 后加 `coverImageConcept`):

```ts
        jsonHint:
          '{"titles":[{"id":"string","label":"利益结果型","content":"string"},{"id":"string","label":"场景痛点型","content":"string"},{"id":"string","label":"反常识/认知冲突型","content":"string"},{"id":"string","label":"新机会趋势型","content":"string"},{"id":"string","label":"个人故事/实录型","content":"string"}],"summaries":[{"id":"string","label":"痛点共鸣版","content":"string"},{"id":"string","label":"悬念反转版","content":"string"},{"id":"string","label":"专业克制版","content":"string"}],"coverSuggestion":"string","coverImageConcept":{"visualConcept":"string","mood":"string","focalObject":"string","palette":"string","titleOverlay":"none","customNegatives":"string"}}',
```

- [ ] **Step 2: 在 `lib/ai/service.test.ts` 加 body 断言**

在该 meta 测试末尾断言区(Task 2 已加 coverImagePrompt 断言之后)再加:

```ts
    expect(fetchSpy.mock.calls[0]?.[1]?.body).toEqual(
      expect.stringContaining("coverImageConcept")
    );
```

(证明 jsonHint 已把概念字段塞进发给模型的 body。)

- [ ] **Step 3: 跑测试**

Run: `npm test -- service`
Expected: PASS(含新 body 断言)

- [ ] **Step 4: lint**

Run: `npm run lint`
Expected: 无错误

- [ ] **Step 5: 提交**

```bash
git add lib/ai/real-provider.ts lib/ai/service.test.ts
git commit -m "feat(ai): include coverImageConcept in real-provider meta jsonHint"
```

---

## Task 5: mock-provider + generators 类型对齐

**Files:**
- Modify: `lib/ai/mock-provider.ts`(mock 返回加样例概念)
- Modify: `lib/mock/generators.ts`(`generateMeta` 返回类型)

- [ ] **Step 1: 在 `lib/ai/mock-provider.ts` 的 mock 返回加概念**

在 `generateTitlesAndSummaries` 返回对象里,`coverSuggestion`(约 L253)之后加:

```ts
      coverImageConcept: {
        visualConcept: "清晨空荡的办公室，亮屏笔记本与散落便签",
        mood: "冷调晨光，低饱和，胶片质感",
        focalObject: "笔记本屏幕",
        palette: "墨黑 + 暖纸米色 + 一点静默蓝绿",
        titleOverlay: "title",
      },
```

- [ ] **Step 2: 改 `lib/mock/generators.ts` 的 `generateMeta` 返回类型**

把 `generateMeta` 的返回类型签名(约 L119)从:

```ts
) : Promise<{ titles: MetaCard[]; summaries: MetaCard[]; coverSuggestion: string }> {
```

改为:

```ts
) : Promise<{ titles: MetaCard[]; summaries: MetaCard[]; coverSuggestion: string; coverImageConcept?: import("@/types/ai").CoverImageConcept }> {
```

(用 inline import 引类型,避免动文件顶部 import 块;`generateMeta` 是 provider 薄封装,只暴露概念、不组装 prompt——组装是 service 层职责。)

- [ ] **Step 3: 跑测试 + 类型检查**

Run: `npm test && npx tsc --noEmit`
Expected: 全绿,无类型错误

- [ ] **Step 4: 提交**

```bash
git add lib/ai/mock-provider.ts lib/mock/generators.ts
git commit -m "feat(ai): mock provider returns coverImageConcept; align generateMeta type"
```

---

## Task 6: 客户端状态类型 + state-machine

**Files:**
- Modify: `types/workflow.ts`(WorkflowState + meta_generated 事件)
- Modify: `lib/state-machine.ts`(3 处 baseState + reducer)
- Modify: `lib/state-machine.test.ts`(补全字段 + 断言)

- [ ] **Step 1: 在 `types/workflow.ts` 加字段**

`WorkflowState`(约 L125)`coverSuggestion` 行之后加:

```ts
  coverImagePrompt: string | null;
```

`meta_generated` 事件类型(约 L169-171)`coverSuggestion: string;` 行之后加:

```ts
      coverImagePrompt: string;
```

- [ ] **Step 2: 在 `lib/state-machine.ts` 的 3 处 baseState 加 `coverImagePrompt: null`**

在 L52、L85、L108 三处 `coverSuggestion: null,` 行之后,各自加:

```ts
    coverImagePrompt: null,
```

(L85、L108 处注意缩进:它们在嵌套对象里,缩进比 L52 多一级,照旁边 `coverSuggestion: null,` 的缩进对齐。)

- [ ] **Step 3: 在 `lib/state-machine.ts` reducer 加赋值**

`case "meta_generated"`(约 L200-206)`coverSuggestion: event.coverSuggestion,` 行之后加:

```ts
        coverImagePrompt: event.coverImagePrompt,
```

- [ ] **Step 4: 在 `lib/state-machine.test.ts` 的 meta_generated 测试补全字段 + 断言**

把该测试的 dispatch event(约 L395-408)从只有 `titles`/`summaries`,改为补上 `coverSuggestion` 和 `coverImagePrompt`:

```ts
    const next = transitionWorkflow(state, {
      type: "meta_generated",
      titles: [
        { id: "title-1", label: "利益结果型", content: "标题 1" },
        { id: "title-2", label: "场景痛点型", content: "标题 2" },
        { id: "title-3", label: "反常识/认知冲突型", content: "标题 3" },
        { id: "title-4", label: "新机会趋势型", content: "标题 4" },
        { id: "title-5", label: "个人故事/实录型", content: "标题 5" },
      ],
      summaries: [
        { id: "summary-1", label: "痛点共鸣版", content: "摘要 1" },
        { id: "summary-2", label: "悬念反转版", content: "摘要 2" },
        { id: "summary-3", label: "专业克制版", content: "摘要 3" },
      ],
      coverSuggestion: "取材建议",
      coverImagePrompt: "【公众号封面 · 900×383】画面概念：清晨办公室",
    });
```

在该测试断言区(约 L410-412)加:

```ts
    expect(next.coverImagePrompt).toBe("【公众号封面 · 900×383】画面概念：清晨办公室");
```

- [ ] **Step 5: 跑测试 + 类型检查**

Run: `npm test -- state-machine && npx tsc --noEmit`
Expected: PASS,无类型错误

- [ ] **Step 6: 提交**

```bash
git add types/workflow.ts lib/state-machine.ts lib/state-machine.test.ts
git commit -m "feat(workflow): persist coverImagePrompt in WorkflowState + meta_generated reducer"
```

---

## Task 7: 客户端派发 + 持久化兜底

**Files:**
- Modify: `components/hooks/use-workflow.ts`(dispatch)
- Modify: `lib/storage/workflow-storage.ts`(typeof 兜底读)

- [ ] **Step 1: 在 `components/hooks/use-workflow.ts` 派发 coverImagePrompt**

把 meta 生成后的 `transitionWorkflow` 调用(约 L680-686)从:

```ts
      updateState(
        transitionWorkflow(state, {
          type: "meta_generated",
          titles: result.titles,
          summaries: result.summaries,
          coverSuggestion: result.coverSuggestion,
        })
      );
```

改为:

```ts
      updateState(
        transitionWorkflow(state, {
          type: "meta_generated",
          titles: result.titles,
          summaries: result.summaries,
          coverSuggestion: result.coverSuggestion,
          coverImagePrompt: result.coverImagePrompt,
        })
      );
```

- [ ] **Step 2: 在 `lib/storage/workflow-storage.ts` 加兜底读取**

在 `coverSuggestion` 兜底块(约 L134-137)之后加同款 `typeof` 兜底:

```ts
    coverImagePrompt:
      typeof rawState.coverImagePrompt === "string"
        ? rawState.coverImagePrompt
        : baseState.coverImagePrompt,
```

- [ ] **Step 3: 类型检查 + lint + 跑测试**

Run: `npx tsc --noEmit && npm run lint && npm test -- workflow-storage`
Expected: 无错误,测试全绿(`workflow-storage.test.ts` 无 coverSuggestion 断言,无需改测试)

- [ ] **Step 4: 提交**

```bash
git add components/hooks/use-workflow.ts lib/storage/workflow-storage.ts
git commit -m "feat(workflow): dispatch + persist coverImagePrompt with typeof fallback"
```

---

## Task 8: UI 显示卡片

**Files:**
- Modify: `components/stages/meta-stage.tsx`(加卡片)
- Modify: `components/stages/final-stage.tsx`(加卡片)

- [ ] **Step 1: 在 `components/stages/meta-stage.tsx` 加显示卡片**

在现有 `coverSuggestion` 卡片(约 L27-34)**之后**加(用 `<pre>` 保留 prompt 的换行与缩进):

```tsx
      {state.coverImagePrompt ? (
        <div className="rounded-[28px] border border-[var(--line-soft)] bg-[#fcfdff] p-6 shadow-sm">
          <p className="text-sm font-semibold text-stone-900">封面生图提示词</p>
          <p className="mt-1 text-xs text-stone-500">AI 生图用 · 900×383 封面</p>
          <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-xs leading-6 text-stone-700">
            {state.coverImagePrompt}
          </pre>
        </div>
      ) : null}
```

- [ ] **Step 2: 在 `components/stages/final-stage.tsx` 加同样卡片**

在现有 `coverSuggestion` 卡片(约 L120-127)**之后**加(与 Step 1 相同的 JSX 块):

```tsx
      {state.coverImagePrompt ? (
        <div className="rounded-[28px] border border-[var(--line-soft)] bg-[#fcfdff] p-6 shadow-sm">
          <p className="text-sm font-semibold text-stone-900">封面生图提示词</p>
          <p className="mt-1 text-xs text-stone-500">AI 生图用 · 900×383 封面</p>
          <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-xs leading-6 text-stone-700">
            {state.coverImagePrompt}
          </pre>
        </div>
      ) : null}
```

- [ ] **Step 3: 类型检查 + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add components/stages/meta-stage.tsx components/stages/final-stage.tsx
git commit -m "feat(ui): display coverImagePrompt card in meta and final stages"
```

---

## Task 9: 全量验证

- [ ] **Step 1: 跑全量测试**

Run: `npm test`
Expected: 全部 PASS,无回归(titles/summaries/coverSuggestion 既有行为不受影响)

- [ ] **Step 2: 类型检查 + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 无错误

- [ ] **Step 3: 人工冒烟(可选)**

Run: `npm run dev`,走一遍 pipeline 到 meta 阶段,确认:
- meta-stage 出现"封面生图提示词"卡片,内容含 `900×383`、`禁忌(硬性)`、概念字段填入。
- 刷新页面后卡片仍在(持久化生效)。
- `coverSuggestion` 卡片行为无变化。

- [ ] **Step 4: 终态提交(如有零散改动)**

```bash
git status
# 若有未提交改动:
git add -A && git commit -m "chore: cover image prompt final touches"
```

---

## 验收对照(对应 spec §10)

| 验收项 | 由哪个任务保证 |
|---|---|
| coverImagePrompt 在 meta 阶段生成 | Task 2(service 组装) |
| 持久化、刷新后仍在 | Task 6 + Task 7 |
| 模型未吐 concept 不报错、出通用 prompt | Task 1(fallback 测试)+ Task 2(optional schema) |
| 产物含比例/光线/配色/固定禁忌 | Task 1 测试断言 |
| titleOverlay 三态分支正确 | Task 1 三个分支测试 |
| 既有行为零回归 | Task 9 全量测试 |
| 无类型错误 | 每个 Task 的 `tsc --noEmit` 步骤 |
