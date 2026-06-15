# 高级模块契约闭环设计

## 目标

为本地支持的 31 个 `:::` 高级模块建立单一契约真源，消除“AI 输出能被解析，但字段与渲染器不匹配，最终生成空卡片”的静默失败。

同时提高正文 Markdown 排版的输出预算，并识别模型因 token 上限截断的返回，避免半截正文进入编辑器和预览。

## 架构

```text
MODULE_DEFS
├─ 模块目录与分类
├─ 字段型 required / optional / repeated 字段
├─ 行型列名、必填列数、最大列数、最少行数
├─ 图片正文型的图片数量
├─ 对话正文型的有效对话行数量
├─ Prompt 紧凑契约文本
└─ 运行时校验

AI 排版结果
→ 围栏语法校验
→ MODULE_DEFS 契约校验
→ 内容完整性校验
→ 成功进入编辑器
→ 失败时携带原因重试一次
→ 仍失败则本地基础 Markdown 兜底
```

## 真源结构

新增 `lib/markdown/module-defs.ts`。

模块分为四种契约：

1. `fields`
   - `required`: 缺少任一字段即失败。
   - `optional`: 允许出现但不强制。
   - `repeated`: 可重复字段，例如 `image-annotate.point`。
2. `rows`
   - `columns`: 按顺序定义列语义。
   - `requiredColumns`: 每行至少需要的非空列数。
   - `maxColumns`: 禁止多余列静默丢失。
   - `minRows`: 至少一行。
3. `markdown-images`
   - `minImages` / `maxImages`。
4. `dialogue`
   - `minLines`，每行必须符合 `角色: 内容`。

模块方括号标题继续作为通用可选元数据，不算字段。

## 校验规则

候选 Markdown 中的每个合法模块都必须满足真源：

- 字段型：
  - 禁止未知字段。
  - 必填字段必须存在且非空。
  - 非 repeated 字段不得重复。
- 行型：
  - 至少达到最少行数。
  - 每行列数必须落在允许范围内。
  - 必填列必须非空。
- 图片正文型：
  - 只允许 Markdown 图片和空行。
  - 图片数量符合约束。
- 对话型：
  - 只允许非空的 `角色: 内容` 行。
  - 有效行数符合约束。

任何失败都返回 `invalid_module_contract`，并附带内部可读的具体原因供 AI 重试反馈和日志使用。不会删除非法字段后继续渲染。

原文已经存在合法模块时，仍保留现有签名一致性校验，禁止排版阶段改名、改字段键或改行宽。

## Prompt

Prompt 从 `MODULE_DEFS` 动态生成 31 行紧凑契约，不手写第二份字段列表。

格式示例：

```text
verdict 字段型｜必填 title, body｜可选 eyebrow
cards 行型｜每行 index | heading | body | tone?｜至少 1 行
gallery 图片正文型｜1 张以上 Markdown 图片
dialogue 对话型｜至少 2 行“角色: 内容”
```

只提供三类语法示例：

- 字段型：`verdict`
- 行型：`cards`
- 正文型：`dialogue` 或 `gallery`

示例用于解释语法，字段契约以真源生成文本为准。

排版优先级明确为：

1. 内容和事实完整。
2. 完整表达优先于强行短段。
3. 一段通常 1–3 句。
4. 只有关键判断、反问和转折可单独成段。
5. 模块稀疏使用，普通正文为主体。

“保留已有模块”改成防御性说明：仅当输入确实含有合法模块时生效。

## Token 与截断

- Markdown 排版调用的 `max_completion_tokens` 从 `2600` 调整为 `4096`。
- `callMimoText()` 读取 `choices[0].finish_reason`。
- `finish_reason === "length"` 时，本次结果视为失败，不返回截断正文。
- provider 按既有重试次数重新请求；仍截断则抛错，由正文模块化编排器进入本地兜底。
- 成功与失败日志记录 `finishReason`；API 返回 usage 时记录 `completionTokens`。

## 非目标

- 本轮不把 `AdvancedModuleNode` 重构成 31 种 TypeScript 判别联合。
- 本轮不修改 31 个模块的视觉 HTML。
- 不新增按钮、接口、积分操作或数据库字段。
- 不要求 AI 每篇文章使用高级模块。

## 测试

1. `MODULE_DEFS` 与 31 个模块目录完全一致。
2. 完整 fixture 中 31 个模块全部通过契约。
3. 缺必填字段、未知字段、重复字段、错列数、空行型模块、坏图片正文和坏对话均失败。
4. Prompt 中的字段与列契约来自真源，并包含三类示例。
5. Markdown 后处理拒绝契约不合法但围栏合法的模块。
6. 排版请求使用 `4096`。
7. `finish_reason=length` 会触发 provider 重试，连续截断时进入本地兜底。
8. 全量测试、lint、build、`git diff --check` 通过。
