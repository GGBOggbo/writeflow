# md2wechat 核心骨架本地复刻设计

## 目标

将现有公众号排版从“按标题切分的统一章节卡片”改成 md2wechat 的模块化骨架。全程本地确定性渲染，不调用 md2wechat API，不改写正文。

## 模块映射

| 当前语义块 | 新骨架 |
| --- | --- |
| 第一块 heading | hero |
| 后续 heading | part |
| quote | quote-card |
| pain | callout |
| transition | bridge |
| list | list-panel |
| comparison | comparison-panel |
| cta | cta |
| paragraph | 普通正文流 |

## 结构规则

- 整篇文章只使用一个 `hero`。
- 每个后续章节标题使用 `part`，序号按出现顺序生成。
- `quote-card` 只承载已经被语义识别为 quote 的内容。
- `callout`、`bridge`、列表和对比模块是独立区块，不包裹相邻正文。
- CTA 继续由确定性节制器保证只保留最后一个。
- 普通正文直接进入文章流，不再按章节统一套白色卡片。
- 所有 HTML 使用微信兼容标签和内联样式。

## 主题规则

`spring-fresh` 与 `editorial-paper` 共用同一套模块 DOM 骨架，只替换颜色、字体、边框、阴影和圆角 token。主题切换不重新调用 AI。

## 兼容性

- 保留现有 `FormattingBlock` 数据结构和 AI 分类协议。
- 保留 Markdown 白名单渲染、正文完整性校验、复制和滚动同步。
- 使用 `data-layout-module` 标注模块，便于测试与调试。

## 验收

- HTML 中不再出现 `data-format-section` 统一章节卡片。
- 首标题输出 `data-layout-module="hero"`。
- 后续标题输出 `data-layout-module="part"`。
- quote、pain、transition、cta 分别输出对应模块标记。
- 两个主题具有相同模块序列。
- Chrome 长文预览能明显看到多种骨架，而不是从头到尾同款卡片。
