# 本地 Markdown 实时公众号预览设计

## 目标

正文阶段改为固定的左右工作台：

- 左侧直接编辑 Markdown 源文。
- 右侧使用本地确定性渲染器即时预览。
- 普通 GFM 与 `:::` 高级模块使用同一条本地渲染链路。
- 预览、主题切换和复制均不调用 AI、不消耗积分。

## 保留能力

以下能力与公众号预览不是同一条链路，继续保留：

- 正文生成完成后的 AI Markdown 节奏整理。
- AI 补充素材。
- 去 AI 味。
- 标题、摘要与封面内容生成。

## 删除范围

彻底删除独立的 AI 公众号排版功能：

- “公众号排版，消耗 1 积分”按钮和空状态。
- `format_draft` 请求状态、重试分支和进度文案。
- `/api/ai/format/stream` 路由。
- `lib/ai/client.ts` 的 `formatDraft()` 客户端请求。
- `lib/ai/service.ts` 的语义块排版服务。
- Provider 中仅服务于 `formatDraft()` 的接口与实现。
- `FormatDraftInput`、`FormatDraftOutput` 及其请求/响应 schema。
- `draftFormattingByVersion`、`draft_formatted`、`format_theme_selected` 等持久化状态。
- 旧 `FormattingBlock[]` 预览分支和相关积分操作。

不会删除正文生成阶段使用的 `formatDraftMarkdown()`。

## 新数据流

```text
Markdown 编辑器
    ↓ 即时更新当前 DraftVersion.content
renderExtendedMarkdown(content)
    ↓
安全 GFM + 31 个高级模块
    ↓
公众号手机预览
    ↓ 复制时
normalizeWechatHtml()
    ↓
微信兼容 HTML
```

## 组件行为

### DraftStage

- 左侧默认显示 Markdown 编辑器，不再区分“阅读模式/编辑模式”。
- 编辑内容即时更新本地界面；持久化沿用现有 workflow storage。
- 左右滚动同步继续保留。
- 切换正文版本时，编辑器和预览同步切换。

### WechatFormatPanel

- `content` 成为唯一正文输入。
- 始终调用 `renderExtendedMarkdown(content)`。
- 不再接收 `formatting`、`loading`、`canGenerate`、`onGenerate` 和 AI 主题状态。
- 复制时富文本使用本地渲染 HTML，纯文本使用 Markdown 原文。
- 主题固定为当前 `wechat-native` 视觉；后续若增加主题，也必须是本地 token 切换。

## 普通 Markdown 兼容

普通 Markdown 不需要先转成高级模块：

- 标题、段落、粗体、列表、表格、代码、图片、alert 和脚注直接渲染。
- 已含 `:::` 的正文额外渲染高级模块。
- 无效或未闭合模块保留为可编辑文本，不吞内容。

## 删除兼容策略

- 读取旧 localStorage 时忽略遗留的 `draftFormattingByVersion`，不因旧数据报错。
- 不执行破坏性数据迁移；旧字段自然停止写入。
- 主题选择记录不再影响预览。

## 测试

- 组件测试：普通 Markdown 无需 AI 即可出现预览。
- 组件测试：左侧编辑后右侧即时更新。
- 组件测试：不再出现积分排版按钮和主题选择。
- 复制测试：富文本来自本地渲染，纯文本保持原 Markdown。
- 状态测试：删除 format 事件后正文编辑、版本切换和恢复仍正常。
- API/Provider 测试：不再暴露独立 `formatDraft()`。
- 全量执行 `npm test`、`npm run lint`、`npm run build`、`git diff --check`。

## 成功标准

- 用户进入正文阶段后，无需点击任何排版按钮。
- 左侧 Markdown 修改后，右侧立即得到对应公众号预览。
- 预览与复制过程零 AI 调用、零积分消耗。
- 正文生成阶段的 AI Markdown 整理仍正常运行。
