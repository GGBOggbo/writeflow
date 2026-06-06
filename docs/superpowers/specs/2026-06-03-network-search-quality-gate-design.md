# AI Writing MVP 联网搜索质量闸门设计

日期：2026-06-03

## 目标

在不改动整体“联网增强”产品策略的前提下，优先修复 3 个会直接影响 MVP 可用性的搜索质量问题：

1. `freshness` 不再写死 `noLimit`
2. search query 不再直接拼接长自然语言
3. 搜索失败不再静默，前端可感知本次是否已降级

本设计不处理以下内容，它们进入后续迭代：

- 搜索结果缓存
- `manual` 模式的完整前端产品化
- LLM 参与 query 提炼

## 设计结论

V1 采用“纯规则提炼 + 分阶段 freshness + 显式降级状态”的实现方案。

不引入新的模型调用，不增加新的 provider，不改变现有 `topics / brief / outline / meta` 的大体调用链。

## 为什么必须先做

### 1. freshness 决定“网感”是否过期

当前 provider 固定使用 `noLimit`，这会让搜索结果严重混入历史内容，尤其会影响：

- `topics` 阶段的痛点判断
- `meta` 阶段的标题和摘要包装

如果时间窗不受控，模型即使 prompt 写得再好，也可能拿着过时语料生成“老人味”很重的表达。

### 2. query 粗糙会让搜索源直接失效

当前 `buildTopicsSearchQuery()` 和同类函数会把用户原始输入和若干运营词直接串起来。

这类 query 在通用搜索尚可勉强工作，但在微信、小红书、内容平台语境下，长句和冗余修饰词会显著降低召回质量。

### 3. 静默降级会破坏用户预期

当前 `safeSearch()` 失败后直接返回 `null`，上层虽然不会崩，但前端不知道本次生成已经失去“联网增强”能力。

这会让用户把“搜索失败导致的平庸结果”误判成“产品本身不行”。

## 方案选择

### 方案 A：纯规则提炼（推荐）

在 `lib/search/service.ts` 中增加轻量 query 预处理：

- 去掉停用词和产品侧噪音词
- 保留核心主题短语
- 限制 query 长度
- 按不同 `intent` 补不同的短尾提示词

优点：

- 稳定
- 可测试
- 零额外模型成本
- 适合当前 MVP 节奏

缺点：

- 对极长、极散的用户输入理解能力有限

### 方案 B：LLM 提炼 query

在搜索前增加一次小模型调用，把长句压成 2-5 个核心词。

优点：

- 语义效果最好

缺点：

- 链路更长
- 失败点更多
- 对当前 MVP 来说过重

### 方案 C：规则 + LLM 混合回退

默认走规则，规则结果不理想时再走 LLM。

优点：

- 效果上限更高

缺点：

- 实现复杂度最高
- 当前阶段性价比最低

### 最终选择

V1 采用方案 A：纯规则提炼。

LLM 提炼保留到 V1.1 再评估。

## freshness 规则

新增一个按 `SearchIntent` 映射 freshness 的规则层。

推荐默认值：

| Intent | Freshness | 原因 |
|--------|-----------|------|
| `topics` | `Past6Months` | 需要兼顾样本量与近期表达 |
| `brief` | `Past6Months` | 用来参考痛点、人群、对标思路 |
| `outline` | `Past6Months` | 用来参考结构和对标文章骨架 |
| `meta` | `PastMonth` | 更强调近期标题网感和平台情绪词 |

后续如果 `meta` 仍然不够“热”，允许进一步收紧到 `PastWeek`。

## query 提炼规则

### 总体原则

query 应该更像“搜索关键词组合”，而不是“产品说明句子”。

### V1 规则

1. 先把原始文本做基础清洗：
   - 去掉多余空白
   - 去掉明显无意义的连接词
   - 截断超长输入
2. 去掉会干扰检索的泛化词：
   - 如 `最新`、`公众号`、`选题`、`爆款` 这类并非所有 intent 都需要的词
3. 保留主题核心词：
   - 优先保留用户输入中的名词短语
   - 保留 `topicLabel` / `topicAngle` / `audience` 等强语义字段
4. 针对不同 `intent` 再补最少量的功能词：
   - `topics`：补 `痛点`
   - `brief`：补 `人群`、`痛点`
   - `outline`：补 `结构`、`大纲`
   - `meta`：补 `标题`、`表达`

### 结果形式

最终产物应该是短 query，而不是说明句。

例如：

- 原始：`如何把小红书做成可复用流程`
- V1 query：`小红书 运营流程 痛点`

而不是：

- `如何把小红书做成可复用流程 公众号 选题 痛点 最新`

## 降级显式化

### 新状态模型

不再只用“有没有 `searchContext`”来暗示搜索是否成功。

新增显式状态：

```ts
type SearchBundleStatus = "success" | "degraded" | "empty";
```

语义如下：

- `success`：搜索成功且拿到有效结果
- `empty`：搜索成功但没有有效结果
- `degraded`：搜索请求失败，系统已自动降级

### 数据层建议

`SearchReferenceBundle` 增加状态字段，或新增包裹类型承载：

```ts
type SearchReferenceBundle = {
  status: "success" | "degraded" | "empty";
  query: string;
  intent: SearchIntent;
  results: SearchResult[];
  seoKeywords: string[];
  crowdedness: "low" | "medium" | "high";
  staleBuzzwords: string[];
  notes: string[];
};
```

其中：

- `empty` 时 `results` 为空数组
- `degraded` 时 `results` 也为空，但 `status` 明确表示这是失败降级，不是自然空结果

### 前端行为

当返回 `degraded` 时：

- 本次生成继续执行
- UI 给出一次明确提示：
  - `联网增强暂不可用，本次生成已自动降级为基础模式`

当返回 `empty` 时：

- 不需要报错
- 可不提示，或只在 debug 信息里保留

## 文件影响范围

### 必改

- `lib/search/types.ts`
  - 新增 freshness 类型
  - 扩展 `SearchQueryInput`
  - 扩展 `SearchReferenceBundle.status`
- `lib/search/service.ts`
  - 新增 query 提炼函数
  - 新增 intent -> freshness 映射
  - `safeSearch()` 不再只返回 `null`
- `lib/search/generic-provider.ts`
  - 接收 freshness 参数并下发给博查 API
- `lib/ai/service.ts`
  - 适配新的搜索返回结构
  - 仅在 `status === "success"` 时向 prompt 注入有效搜索内容
  - 在 `degraded` 时把状态继续透给前端

### 很可能要改

- `types/ai.ts`
  - 若前端要感知搜索降级，生成结果结构需要补充状态透传字段
- `lib/ai/client.ts`
  - 接收扩展后的响应结构
- `components/hooks/use-workflow.ts`
  - 感知搜索降级，并设置可展示的 UI 提示
- 各 stage 组件
  - 展示轻量降级提示

### 测试

- `lib/search/service.test.ts`
  - query 提炼
  - freshness 映射
  - degraded / empty / success 三态
- `lib/ai/service.test.ts`
  - 仅在 `success` 时注入搜索上下文
- 前端测试
  - 搜索降级提示出现

## 非目标

本轮不做：

- cache
- LLM query 提炼
- 搜索结果持久化
- 手动模式完整交互优化

## 实施顺序

1. `freshness` 参数化
2. 纯规则 query 提炼
3. `success / degraded / empty` 三态打通
4. 前端降级提示

## 成功标准

满足以下条件即可认为这一轮完成：

1. `topics / brief / outline / meta` 不再使用统一的 `noLimit`
2. query 不再是直接拼接长自然语言
3. 搜索失败时前端可明确感知“本次已降级”
4. 现有主生成链路不被阻断
