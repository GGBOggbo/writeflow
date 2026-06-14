# 封面生图提示词 (Cover Image Prompt) — 设计

> 日期:2026-06-14 · 状态:已与用户确认方案,待实现
> 参考项目:`~/data/project/guizang-social-card-skill`(微信公众号/小红书图文卡片 Skill)

## 1. 背景与目标

### 现状
公众号生成 pipeline 为 `idea → topic → brief → outline → draft → meta → finalize`。所有 prompt 走同构模式 `{ systemPrompt, userPrompt, outputSchema }`,在 [lib/ai/service.ts](../../../lib/ai/service.ts) 串联,带流式 + 进度上报。

封面相关逻辑已存在于 **meta 阶段**:[lib/ai/prompts/meta.ts:76-86](../../../lib/ai/prompts/meta.ts#L76) 产出 `coverSuggestion` 字段——一段**证据优先**的文字取材建议(900×383、真人实拍优先、明确写着"不要推荐生图")。

### 目标
新增一条 **AI 生图 prompt** 产出,用于公众号 **900×383 主封面**。它最终交给图像模型去生成封面图。

### 与现有 coverSuggestion 的关系(关键决策)
**并存,独立轨道,互不改写。**
- `coverSuggestion`(证据优先)原样保留——给能拍到真实素材的人。
- `coverImagePrompt`(新增,AI 生图)是平行的新产出——给没有真实素材、需要 AI 生图的人。
- 两者来自同一个 meta LLM 调用,但是模型为它们做**不同的创意决定**(取材 vs 生图),字段彼此独立。

### 借鉴 guizang 的核心方法论
guizang 的封面设计知识(image-overlay quiet-zone、氛围光线、克制配色、主体避让、anti-slop)本质是**确定性规则**。它的整套 `components.md` 硬上限 + `validate-social-deck.mjs` 7 条规则传达一个原则:**手艺规则不能交给 LLM 自觉,要编码**。本设计忠实翻译这条原则。

## 2. 方案选型:概念 + 模板(A)

**模型只出"创意概念"(结构化几字段),代码用纯函数把概念套进 guizang 构图模板,产出最终 prompt 字符串。**

否决方案:
- **B(纯模型生成,规则塞进 meta 指令)**:规则交给模型自觉 → 会改写、会漏、meta prompt 已 90 行再压规则遵守率更低、不可单测。
- **C(新建独立 cover 阶段)**:加 pipeline 阶段、加 API 调用、改 UI 流程,过重。

选 A 的理由:guizang 规则放代码 = 每次一字不差、可断言、可确定性调参;模型只干它擅长的(挑视觉概念);复用现有 `{schema → format}` 模式;不加阶段。

## 3. 数据流

```
模型(meta 阶段,同一次调用)
  ├─ titles / summaries / coverSuggestion        (不变)
  └─ coverImageConcept (结构化,optional)         ← 新增:模型的创意决定
        ↓ metaResponseSchema 校验(optional 字段,缺失不抛)
service.generateTitlesAndSummaries
  └─ buildCoverImagePrompt(parsed.coverImageConcept)   ← 纯函数,guizang 规则全在这
        ↓ 产出 coverImagePrompt: string
        → GenerateTitlesAndSummariesOutput.coverImagePrompt
        → transitionWorkflow({type:"meta_generated", ..., coverImagePrompt})
        → WorkflowState.coverImagePrompt (持久化,镜像 coverSuggestion)
        → meta-stage.tsx / final-stage.tsx 显示卡片
```

## 4. 概念 schema:`CoverImageConcept`

模型只填这几个变量字段(创意部分):

```ts
type CoverImageConcept = {
  visualConcept: string;                                    // 画面画什么(场景/物件/隐喻),可不带人
  mood: string;                                             // 情绪 + 光线方向(氛围、时段、光质)
  focalObject: string;                                      // 焦点主体(必须完整保留、不可裁切)
  palette: string;                                          // 克制的 2-3 色基调
  titleOverlay: "none" | "tag" | "title";                   // 标题是否压图(模型按内容判断)
  customNegatives?: string;                                 // 概念专属的"不要"(吸收方案 B 的灵活性)
};
```

设计要点:
- **不含人物强制项**——用户明确"提示词不一定要有人",与现有 coverSuggestion 的"真人露出优先"解耦。
- `titleOverlay` 三态覆盖用户"都可以"的诉求,由模型按内容判断(纯观点/情感类用 `title` 或 `tag`,强证据类用 `none`)。

对应 zod(schema 必须设 **optional**,见 §7 雷点 2):

```ts
const coverImageConceptSchema = z.object({
  visualConcept: z.string().trim().min(1),
  mood: z.string().trim().min(1),
  focalObject: z.string().trim().min(1),
  palette: z.string().trim().min(1),
  titleOverlay: z.enum(["none", "tag", "title"]),
  customNegatives: z.string().trim().min(1).optional(),
});

// 加进 metaResponseSchema,optional:
export const metaResponseSchema = z.object({
  titles: z.array(metaCardSchema).length(5),
  summaries: z.array(metaCardSchema).length(3),
  coverSuggestion: z.string().trim().min(1),
  coverImageConcept: coverImageConceptSchema.optional(),   // ← 新增,optional
  searchStatus: searchStatusSchema,
});
```

## 5. 模板产出:`buildCoverImagePrompt(concept)`

纯函数,位于新文件 `lib/ai/prompts/cover-image.ts`。**概念是变量(模型填),骨架是常量(代码写死)。**

`concept` 为 `undefined`(模型没吐 / 老数据)时,返回通用 fallback prompt,**绝不抛错**。

产出结构(概念填入固定骨架):

```
【公众号封面 · 900×383 (2.35:1)】
画面概念：{visualConcept}
情绪光线：{mood}；氛围光优先,拒绝正午高反差 / 闪光灯 / 游客照质感
焦点主体：{focalObject}（必须完整入镜,不可裁切、不被文字遮挡）
配色：克制——{palette}；禁止高饱和堆色、禁止彩虹渐变
构图：宽幅横向构图(标题居中偏左、主体偏右是微信封面约定)
      {titleOverlay≠none：画面左侧留 ≥35% 低细节安静区供压字,主体偏向右侧}
      {titleOverlay=none：主体可居中或偏一侧,无压字约束}
人物：不强制出现(按概念判断,可无人)
{customNegatives：概念专属禁忌：{customNegatives}}

禁忌(硬性,所有概念固定):
- 不要装饰性光斑 / bokeh / blob / 贴纸 / 无意义圆形
- 不要假数据截图、假 UI、假聊天记录、假后台
- 不要把文字、logo、水印、二维码、签名渲进图里
- 不要多手指、变形文字、不自然光照、超现实拼接
- 不要 stock-photo 式刻板微笑 / 摆拍

{titleOverlay=title：标题压字规范：落安静区,4-8 字,纸米色 #f5f1e8(非纯白),字重 400-500,左对齐,不压焦点主体}
{titleOverlay=tag：小标签规范：角标 4-8 字,同色规范,不压焦点主体}
{titleOverlay=none：(无压字段落)}
```

## 6. guizang 知识 → 代码规则映射

| guizang 规则(出处) | 编码位置 | 怎么编码 |
|---|---|---|
| 选图为主、遮罩兜底 ([image-overlay.md Rule 1]) | 模板"情绪光线"行 | 强制氛围光措辞,拒绝高饱和 |
| quiet-zone ≥30% 安全区 ([image-overlay.md Step 1]) | 模板 titleOverlay≠none 分支 | 强制留 ≥35% 低细节区 |
| 主体避让、不穿脸 ([image-overlay.md Rule 2]) | 模板"焦点主体"行 | 不可裁切、不被文字遮挡 |
| image-toned tint、非纯黑 ([image-overlay.md Step 3]) | 模板压字色 | 纸米色 #f5f1e8,字重 400-500 |
| 克制配色、单一锚点 ([style-system.md Swiss/Editorial]) | 模板"配色"行 | 禁高饱和堆色、禁渐变 |
| anti-slop:无装饰 blob/假数据 ([components.md Hard Rules]) | 模板"禁忌"段(固定) | 每次一字不差 |
| 越大越细(字重随字号降) ([components.md]) | 模板压字字重 | 400-500,非 700+ |
| 文字不压焦点 / 缩略图可读 ([image-overlay.md Step 4]) | 模板压字落点 | 落安静区、左对齐 |

## 7. 精确改动清单(18 处,3 个雷点)

> 2026-06-14 复核:代码更新后重新核对,real-provider 已重构为 spec 配置驱动(jsonHint 从 L196 移到 L209-210,在 `callMimo` 配置对象内);新发现 `lib/mock/generators.ts:107 generateMeta()` 需同步。其余 16 处行号零位移,方案不变。

### 7.1 服务端链(新增 prompt 产出)

| 文件 | 改动 | 备注 / 雷点 |
|---|---|---|
| `types/ai.ts` | +`CoverImageConcept` 类型;`GenerateTitlesAndSummariesOutput` +`coverImagePrompt: string` | — |
| `lib/ai/schemas.ts` | +`coverImageConceptSchema`;`metaResponseSchema` 加 `coverImageConcept`(optional) | **雷点 2:必 optional** |
| `lib/ai/prompts/meta.ts` | +一段指令让模型吐 coverImageConcept(独立于证据链那段,强调可不带人、按内容判 titleOverlay) | — |
| **`lib/ai/prompts/cover-image.ts`** | **新文件**:`buildCoverImagePrompt(concept)` 纯函数 + fallback | 核心实现 |
| `lib/ai/prompts/cover-image.test.ts` | 新测试:overlay 三分支 + customNegatives + undefined fallback | — |
| `lib/ai/real-provider.ts` | `callMimo` 的 meta 配置对象(L206-215)里 `jsonHint` 字符串(L209-210)加 `coverImageConcept`;同对象 `schema` 已是 `metaResponseSchema`(会自动带上新字段) | **雷点 1:漏改 jsonHint 则真模型不吐**。注:该文件已重构为 spec 配置驱动,meta 的 `buildPrompt`/`jsonHint`/`schema` 在同一对象,改动更集中 |
| `lib/mock/generators.ts:107` | `generateMeta()` 返回类型加 `coverImageConcept`(与 mockAIProvider 对齐)。**只加概念,不在此组装 coverImagePrompt**(它是 service 层职责,这里是 provider 薄封装) | 新发现的遗漏点;当前零消费者,低风险 |
| `lib/ai/mock-provider.ts` | `generateTitlesAndSummaries` 返回加样例 concept | — |
| `lib/ai/service.ts` | `generateTitlesAndSummaries` parse 后调 `buildCoverImagePrompt`,挂到 output | — |
| `lib/ai/prompts/meta.test.ts` | +断言新指令块存在 | — |

### 7.2 客户端镜像(照 `coverSuggestion` 全套照搬)

| 文件 | 改动 | 备注 |
|---|---|---|
| `types/workflow.ts:125` | `WorkflowState` +`coverImagePrompt: string \| null` | — |
| `types/workflow.ts:171` | `meta_generated` 事件 payload +`coverImagePrompt: string` | — |
| `lib/state-machine.ts:52,85,108` | 三处 baseState/reset +`coverImagePrompt: null` | — |
| `lib/state-machine.ts:200-206` | `meta_generated` reducer +`coverImagePrompt: event.coverImagePrompt` | — |
| `components/hooks/use-workflow.ts:685` | 派发 +`coverImagePrompt: result.coverImagePrompt` | — |
| `lib/storage/workflow-storage.ts:134` | 持久化读取,照 `typeof === "string" ? ... : baseState.x` 兜底 | **雷点 3:漏兜底则老 workflow 加载崩** |
| `components/stages/meta-stage.tsx` | +显示卡片(抄 coverSuggestion 那块) | — |
| `components/stages/final-stage.tsx:120` | +显示卡片(同上,final 是发布前总览) | — |

### 雷点汇总
1. **real-provider jsonHint**(L196):硬编码 JSON 形状提示,加字段必须同步改,否则真实模型不吐 concept → schema optional 兜底成通用 prompt(不崩,但退化)。
2. **metaResponseSchema 字段 optional**:parse 闸门(service.ts:653)对 mock+real+老数据生效。optional 保证任一缺失不抛。
3. **workflow-storage 兜底**:照现有 `coverSuggestion` 的 `typeof` 读法,保证存量 workflow 不缺字段。

## 8. 测试策略

- `cover-image.test.ts`(新):
  - `titleOverlay="none"` 不含压字段落
  - `titleOverlay="tag"` 含角标规范
  - `titleOverlay="title"` 含标题压字规范 + 纸米色字重
  - `customNegatives` 存在时进输出
  - `concept=undefined` 返回 fallback(含比例 + 通用禁忌,不含空槽)
  - 所有分支都含固定禁忌段(断言"假数据""水印""多手指"等关键词存在)
- `meta.test.ts`(改):+断言新指令块关键词(如"coverImageConcept""画面概念""可不带人")。
- mock-provider:返回合法 concept,保证 service.test / 端到端冒烟不退化。

## 9. 范围边界(YAGNI,本期不做)

- **1:1 分享图 prompt**:concept 形状无关,以后加 `variant: "wide" | "square"` 分支很便宜。本期只出 900×383 主封面。
- **不新增 pipeline 阶段**,不动 brief/outline/draft/humanize/format,不动渲染管线与 credits。
- **coverSuggestion 全程不动**。
- **UI 仅显示**(只读卡片),不做"复制 prompt""重新生成""编辑 concept"等交互。

## 10. 验收标准

1. `coverImagePrompt` 在 meta 阶段生成,随 workflow 持久化,刷新后仍在。
2. 真实模型未吐 concept 时(optional 兜底)不报错,产出通用可用 prompt。
3. 产物 prompt 必含:比例 900×383、氛围光线约束、克制配色约束、固定禁忌段。
4. `titleOverlay` 三态分支各自产出正确压字/不压字段落。
5. 现有 titles/summaries/coverSuggestion 行为零回归(现有 meta.test.ts 全绿)。
6. `npm test`(或项目测试命令)全绿,无类型错误。
