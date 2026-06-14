# 公众号排版语义标注 · 反向边界设计

## 问题证据

format 阶段([format-draft.ts](../../../lib/ai/prompts/format-draft.ts))让 AI 给正文分段贴语义标签时,严重退化为 `paragraph`:[v2 设计 spec](2026-06-13-wechat-formatting-v2-design.md) 记录"100 块中 98 个 paragraph"。现有对策是 [quality.ts](../../../lib/formatting/quality.ts) 的事后质量闸门(长文 paragraph > 94% 报警重试),属于**事后惩罚**。

根因:format prompt **只正向定义 8 种类型**("paragraph:普通叙述段落"),缺反向边界——AI 不知道"这段虽像叙述,但其实该标 quote / pain / transition",于是默认全标 paragraph。

## 目标

在源头(format prompt)给 AI 反向判断依据,让它**标 paragraph 前先自检**,从源头减少退化,而不只靠事后重试。

## 方案

改 [format-draft.ts](../../../lib/ai/prompts/format-draft.ts) 的"=== 语义类型 ==="段,给 5 个易混类型加反向边界(措辞沿用现有硬风格"必须 / 不要"):

```text
paragraph：普通叙述段落。
  ⚠️ 标注前必须反向自检：情绪爆点、结论、反问、停顿、纠正误区、作者立场都不是 paragraph，
     要按真实角色归类。长文里连续 paragraph 是最大的失败模式，逐行机械输出 paragraph 等于没识别。

quote：核心判断或金句（能被单独摘抄的洞见）。
  避：普通叙述不要标；情绪爆点和反问不算金句；不要为了丰富样式把普通句硬拔成 quote。

pain：痛点、风险或警示（指出读者真实的损失或危险）。
  避：作者立场不是痛点；只是纠正某个误区时按更准确的角色判断；普通提醒不要硬拔成 pain。

transition：转折、停顿或分隔（叙事节奏的断点）。
  避：上下文逻辑连贯时不要加；普通段落之间的自然衔接不算 transition。

cta：结尾行动号召或互动提问。
  避：只在收尾用；正文中间的提问不算 cta。
```

`heading` / `list` / `comparison` 保持原定义不动(结构性强,不会退化进 paragraph)。

反向边界的判断依据来自 [md2wechat 模块参考](../../md2wechat-module-reference.md)(serves 框架 + when/when_not 取舍)。

## 范围(只动一个文件 + 其测试)

- 改:[format-draft.ts](../../../lib/ai/prompts/format-draft.ts) 的"=== 语义类型 ==="段
- 测:[format-draft.test.ts](../../../lib/ai/prompts/format-draft.test.ts)

**不动**:[classification.ts](../../../lib/formatting/classification.ts)(schema)、[render.ts](../../../lib/formatting/render.ts)、[quality.ts](../../../lib/formatting/quality.ts)、[draft.ts](../../../lib/ai/prompts/draft.ts)、[types/workflow.ts](../../../types/workflow.ts) 的 `FORMATTING_BLOCK_TYPES`。

## 测试(单测,TDD)

`buildFormatDraftPrompt` 是纯函数,输出可断言:
- 断言输出含"反向自检"(paragraph 自检机制存在)
- 断言含 quote / pain / transition / cta 各自的边界关键词

确定性测试,锁住"边界确实写进 prompt"。先写失败测试 → 改 prompt → 绿。

## 验收

- format-draft.test.ts 单测全绿
- 真实长文(如 v2 spec 提到的"200 美元续费"那篇)跑一次 format,`paragraphRatio` 较改前明显下降(集成验证,非单测,人工对比)
- 8 类型 schema 不变,不补新块,quality.ts 阈值不动

## 不在范围(留下一轮)

- 补新语义块(hero / myth-fact / quote-card 等)——需动 schema + render + 测试,另开 spec
- 调整 quality.ts 阈值——先观察反向边界的效果,再决定是否收紧 94% / 85%
- 正文可编辑、微信兼容渲染层
