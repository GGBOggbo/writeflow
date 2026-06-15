# md2wechat 全模块本地复刻设计

## 目标

在不调用 md2wechat CLI 或远程 API 的前提下，让当前项目完整支持用户提供样稿中的基础 Markdown、31 种 `:::` 高级模块以及对应的 `wechat-native` 本地确定性渲染。

“完整支持”表示编辑器能够解析、预览、持久化和导出所有模块；不表示 AI 必须在每篇文章中使用所有模块。

## 输入证据

- 411 行完整 Markdown 样稿。
- 与该 Markdown 对应的约 156KB、1006 行转换 HTML。
- HTML 中全部 `data-mpa-action-id`、字段内容、DOM 层级和内联样式。
- `wechat-native` 主题详情页的桌面与 430px 手机视口预览。

## 架构

```text
Markdown source
→ 自定义 ::: 模块词法解析
→ ArticleNode[]（普通 Markdown 节点 + 31 种模块节点）
→ 确定性模块渲染器
→ wechat-native 主题 token
→ 浏览器预览 HTML
→ 微信兼容归一化
→ 可复制富文本 HTML
```

### 解析边界

- 自定义解析器只识别成对的 `:::` 块，不执行块内任何指令。
- 每种模块使用独立 schema 校验字段；未知模块保留为普通文本并产生可见降级，不静默丢失。
- 普通 Markdown 继续交给现有安全 GFM 渲染器。
- GFM alert 和脚注作为基础 Markdown 扩展补齐，不伪装成高级模块。

### 数据模型

新增 `ArticleNode` 判别联合类型：

- 基础节点：`markdown`。
- 内容结构：`hero`、`part`、`label-title`、`quote`、`summary`、`verdict`、`notice`、`cta`。
- 信息组织：`cards`、`metrics`、`infographic`、`audience-fit`、`toc`、`checklist`、`toolbox`、`specs`、`faq`。
- 图片结构：`image-text`、`image-compare`、`image-annotate`、`image-steps`、`gallery`、`longimage`。
- 商业与品牌：`people`、`cases`、`pricing`、`logos`、`author-card`、`series`、`subscribe`。
- 叙事结构：`dialogue`。

字段保持结构化，不把 `title | value | note` 长期存成未经解析的字符串。

## 渲染策略

- 以补充 HTML 为行为契约，复刻模块层级、尺寸比例、视觉节奏和内联样式规则。
- 颜色、字体、圆角、阴影、间距集中到 `wechat-native` token，不散落在解析逻辑中。
- 所有模块必须有单模块快照/结构测试。
- 不直接注入样稿中的第三方脚本或外链 CSS；代码高亮使用本地确定性方案。

## 微信兼容

- 浏览器预览可使用 grid、flex 和滚动容器表现完整效果。
- 导出 HTML 采用确定性降级：
  - 多列 cards、metrics、pricing、logos、people、cases 转为 table 或上下单列。
  - image-compare 默认导出为上下排列，避免微信窄屏挤压。
  - gallery 导出为静态图片序列，不依赖滑动脚本。
  - longimage 导出为普通完整长图，不依赖滚动容器。
  - dialogue 保留左右身份区分，但避免依赖媒体查询。
- 清除 class、data 属性、事件属性和编辑器专用标记后，正文仍须保持可读。

## AI 使用边界

- AI Markdown 阶段可以输出受支持的 `:::` 模块。
- 默认每篇文章使用 3–6 个高级模块；普通段落仍是主体。
- `pricing`、`logos`、`people`、`cases`、`metrics`、`author-card` 等必须有上游真实素材才可生成。
- 不允许 AI 编造价格、指标、合作品牌、身份、案例和图片地址。
- AI 输出无法通过 schema 时降级为普通 Markdown，不影响正文交付。

## 兼容与状态

- 当前 `FormattingBlock[]` 保留，用于旧稿和旧缓存恢复。
- 新 Markdown 渲染路径直接从正文 source 生成 `ArticleNode[]`；不强制迁移历史数据。
- AI 补全仍只替换素材占位符，并保留模块语法。
- 主题选择、积分和数据库逻辑不变。

## 测试

1. 解析全部 31 种模块及错误输入。
2. 对每种模块验证关键字段与 DOM 标记。
3. 使用完整 411 行样稿做端到端渲染测试，确保模块集合完整。
4. 验证 GFM alert、脚注、代码块、表格和图片。
5. 验证微信导出降级后无脚本、无 class/data 标记且内容完整。
6. 浏览器检查桌面和 430px 手机预览。
7. 运行全量测试、lint、build 和 `git diff --check`。

## 非目标

- 不接入 md2wechat 远程 API 或 CLI。
- 不复制第三方依赖的服务端实现。
- 不新增数据库表或积分收费项。
- 不要求每篇文章自动出现所有高级模块。
