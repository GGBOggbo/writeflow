# Open Design 前端 UI 详细描述

> 基于对 open-design v0.10.0 源码的完整分析。本文档旨在支持 1:1 复刻。

---

## 一、整体架构概览

Open Design 是一个**本地优先的设计产品**，前端采用 **Next.js 16 App Router + React 18 + Tailwind CSS 4 + Framer Motion**。整个应用是一个单页面应用，通过客户端路由在两个主要视图之间切换：

1. **EntryView（首页/入口）** — 项目管理、创建新项目、浏览设计系统、插件市场等
2. **ProjectView（项目工作台）** — 左侧聊天面板 + 右侧预览/工作区，可拖拽调整分栏宽度

顶部始终有一个 **WorkspaceTabsBar**（浏览器风格的 Tab 栏），支持多项目标签切换、拖拽排序、Cmd+W 关闭、Cmd+T 搜索。

---

## 二、设计令牌（Design Tokens）

### 2.1 色彩系统

#### 亮色主题

| 类别 | 变量名 | 色值 | 用途 |
|------|--------|------|------|
| 背景-主 | `--bg` | `#faf9f7` | 页面底色 |
| 背景-应用 | `--bg-app` | `#faf9f7` | 应用底色 |
| 背景-面板 | `--bg-panel` | `#fdfcfa` | 卡片/面板/输入框底色 |
| 背景-柔 | `--bg-subtle` | `#f4f5f7` | hover 背景 |
| 背景-灰 | `--bg-muted` | `#eef1f5` | 更深的 hover 背景 |
| 背景-填充3 | `--bg-fill-tertiary` | `rgba(0,0,0,0.03)` | 极浅填充 |
| 背景-填充2 | `--bg-fill-secondary` | `rgba(0,0,0,0.06)` | 浅填充 |
| 背景-填充 | `--bg-fill` | `rgba(0,0,0,0.12)` | 中等填充 |
| 背景-浮起 | `--bg-elevated` | `#fffefc` | 弹窗/提示底色 |
| 边框 | `--border` | `#e1e5eb` | 默认边框 |
| 边框-强 | `--border-strong` | `#c9d0da` | hover 边框 |
| 边框-柔 | `--border-soft` | `#edf0f4` | 轻边框/分割线 |
| 文字 | `--text` | `#1a1916` | 正文 |
| 文字-强 | `--text-strong` | `#0d0c0a` | 标题 |
| 文字-灰 | `--text-muted` | `#74716b` | 次要文字 |
| 文字-柔 | `--text-soft` | `#989590` | 辅助文字 |
| 文字-淡 | `--text-faint` | `#b3b0a8` | placeholder |

#### 品牌强调色（烧橙色系）

| 变量名 | 色值 | 用途 |
|--------|------|------|
| `--accent` | `#c96442` | 主按钮、主CTA |
| `--accent-strong` | `#b45a3b` | hover 状态 |
| `--accent-soft` | `#f5d8cb` | 背景 tint |
| `--accent-tint` | `#fbeee5` | 极浅 tint |
| `--accent-hover` | `#b45a3b` | 按钮 hover |

#### 语义色

| 变量名 | 色值 | 用途 |
|--------|------|------|
| `--green` / `--green-bg` / `--green-border` | `#1f7a3a` / `#e8f7ee` / `#c6ead2` | 成功/connector |
| `--blue` / `--blue-bg` / `--blue-border` | `#2348b8` / `#e8efff` / `#c8d6ff` | 选中态/文件 |
| `--purple` / `--purple-bg` / `--purple-border` | `#6c3aa6` / `#f3ecf9` / `#e4d4f1` | MCP/设计 |
| `--red` / `--red-bg` / `--red-border` | `#9c2a25` / `#fdecea` / `#f5c6c2` | 错误/删除 |
| `--amber` / `--amber-bg` | `#b26200` / `#fff3e0` | 警告 |

#### 选中态（蓝色，独立于 accent）

| 变量名 | 色值 | 用途 |
|--------|------|------|
| `--selected` | `#2563eb` | 选中指示 |
| `--selected-soft` | `rgba(37,99,235,0.16)` | 选中 ring |

#### 暗色主题

完整暗色映射（`[data-theme="dark"]`）：
- `--bg: #1a1917` / `--bg-panel: #222120` / `--bg-subtle: #252321` / `--bg-muted: #2e2c29`
- `--text: #e8e4dc` / `--text-strong: #f2ede4` / `--text-muted: #9a9690`
- `--accent: #d97a56` / `--accent-strong: #e8896a`
- 所有语义色都有暗色变体，保持相同的语义层级

### 2.2 阴影

| 变量 | 亮色值 | 暗色值 |
|------|--------|--------|
| `--shadow-xs` | `0 1px 0 rgba(28,27,26,0.04)` | `0 1px 0 rgba(0,0,0,0.2)` |
| `--shadow-sm` | `0 1px 2px rgba(28,27,26,0.05), 0 1px 3px rgba(28,27,26,0.04)` | `0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)` |
| `--shadow-md` | `0 6px 24px rgba(28,27,26,0.07), 0 2px 6px rgba(28,27,26,0.04)` | `0 6px 24px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.25)` |
| `--shadow-lg` | `0 24px 60px rgba(28,27,26,0.16), 0 8px 16px rgba(28,27,26,0.07)` | `0 24px 60px rgba(0,0,0,0.6), 0 8px 16px rgba(0,0,0,0.3)` |

### 2.3 圆角

| 变量 | 值 | 用途 |
|------|----|------|
| `--radius-sm` | `6px` | 按钮、输入框、小卡片 |
| `--radius` | `8px` | 弹窗、面板 |
| `--radius-lg` | `12px` | 大卡片、模态框 |
| `--radius-pill` | `999px` | 标签、badge、开关 |

### 2.4 排版

| 变量/场景 | 字体 |
|-----------|------|
| `--sans`（正文） | `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei UI', 'Noto Sans', Roboto, 'Helvetica Neue', Arial, sans-serif` |
| `--serif`（衬线） | `'Source Serif Pro', 'Source Serif 4', 'Iowan Old Style', 'Apple Garamond', Georgia, 'Times New Roman', serif` |
| `--mono`（代码） | `ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace` |
| `--prose-font-size` | `15px` / 行高 `1.75` |
| `--code-font-size` | `13px` / 行高 `1.65` |
| body 基础字号 | `13.5px` / 行高 `1.5` |

---

## 三、全局布局结构

### 3.1 Workspace Shell（最外层）

```
┌──────────────────────────────────────────────────────────┐
│ WorkspaceTabsBar (38px 高)                               │
│ [Home] [Project1 ×] [Project2 ×]  ...  [+] [⚙] [Avatar]│
├──────────────────────────────────────────────────────────┤
│                                                          │
│  workspace-shell__body                                   │
│  (EntryShell 或 ProjectView)                             │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- **整体**：100vw × 100vh，`display: grid`，两行 `36px minmax(0, 1fr)`
- **背景**：`var(--bg-app)` = `#faf9f7`
- **overflow: hidden**

### 3.2 WorkspaceTabsBar（标签栏）

**布局**：
- 高度 38px，背景 `color-mix(in srgb, var(--bg-panel) 88%, var(--bg-subtle))`
- 底部有一条 0.5px 的分割线（`color-mix(in srgb, var(--border) 64%, transparent)`，`scaleY(0.5)`）
- 内部有微妙的内阴影 `0 1px 0 color-mix(in srgb, var(--bg-panel) 80%, transparent) inset`
- 左侧 macOS traffic light 控件有 8px margin
- 支持 `-webkit-app-region: drag`（桌面端窗口拖拽）

**标签样式**：
- 固定宽度 124px（pinned Home 标签 96px），高度 24px
- 边框 `1px solid var(--border)`，圆角 `6px`
- 默认透明背景，`var(--text-muted)` 色文字
- 字号 11.5px，字重 520
- **Active 状态**：背景 `color-mix(in srgb, var(--bg-panel) 92%, var(--bg-subtle))`，`box-shadow: 0 1px 1px color-mix(...)`，文字 `var(--text-strong)`
- **Hover**：背景微变深
- **拖拽中**：`opacity: 0.88`，`translateY(-2px) scale(1.015)`，`box-shadow: 0 12px 28px ...`
- **关闭按钮**：18×18px，圆角 5px，默认 `opacity: 0`（hover/active 时显示）
- **新建按钮**：28×28px，圆角 6px，透明背景，hover 时微变

**响应式**（≤720px）：标签折叠为 40-44px 宽，只显示图标。

---

## 四、EntryView（首页）

### 4.1 整体布局

```
┌───────────────────────────────────────────────────────┐
│  EntryNavRail  │         entry-main (scroll)          │
│  (可折叠侧边栏) │  ┌─────────────────────────────┐    │
│                │  │ topbar (sticky)              │    │
│  [🏠 Home]     │  │ [≡] [GitHub★] [Discord]     │    │
│  [📁 Projects] │  │ [Model Switcher] [Use Every] │    │
│  [⚡ Tasks]    │  │ [Updater] [Avatar Menu]      │    │
│  [🧩 Plugins]  │  └─────────────────────────────┘    │
│  [🎨 DS]       │  ┌─────────────────────────────┐    │
│  [🔗 Integ]    │  │ entry-main__inner            │    │
│                │  │                              │    │
│  [+ New]       │  │  HomeView / Projects /       │    │
│                │  │  DesignSystems / Plugins ... │    │
│                │  │                              │    │
│                │  └─────────────────────────────┘    │
└───────────────────────────────────────────────────────┘
```

### 4.2 EntryNavRail（左侧导航栏）

- 默认**折叠**（Manus 风格），只显示图标
- 点击 topbar 的 `≡` 按钮展开为**覆盖式侧边栏**
- open/collapsed 状态持久化到 `localStorage`
- 按钮 hover：`background-color 120ms ease, color 120ms ease`
- 按钮 active：`transform: scale(0.97)`

### 4.3 Topbar（粘性顶栏）

- 粘性定位 `position: sticky; top: 0`
- 包含元素（从左到右）：
  1. **Rail 切换按钮**（≡）：20px 图标
  2. **GitHub Star Badge**
  3. **Discord Badge**（图标 + "Discord" + "· 123 online"）
  4. **InlineModelSwitcher**（CLI/API 模式 + 模型选择）
  5. **Use Everywhere 按钮**（hammer 图标 + 文字）
  6. **UpdaterPopup**
  7. **AvatarMenu**（设置菜单入口）

**窄屏行为**（≤900px）：topbar chips 折叠到 settings dropdown 中。

### 4.4 HomeView（首页主区域）

HomeView 是默认显示的首页视图，包含：

#### 4.4.1 HomeHero（核心输入区）

**垂直排列的组件链**：

1. **品牌标记（Brand Mark）**
   - 30×30px 圆形，`linear-gradient(135deg, var(--accent-tint), var(--accent-soft))`
   - 内嵌 logo 图片

2. **标题（Title）**
   - 大字标题，字重 600+，字号约 14px（topbar 样式）
   - 入场动画：`od-fade-slide-up 400ms` 延迟 40ms

3. **副标题（Subtitle）**
   - `var(--text-muted)` 色，字号 11.5px
   - 入场动画：`od-fade-slide-up 400ms` 延迟 80ms

4. **输出类型 Tab 栏**
   - 横向标签：Prototype / Deck / Template / Media 等
   - 当前选中用下划线或背景区分

5. **输入卡片（Input Card）**
   - 圆角 12px 的容器
   - 内含 Lexical 富文本编辑器
   - 底部工具栏：设计系统选择、技能选择、发送按钮
   - 入场动画：`od-fade-slide-up 350ms` 延迟 100ms

6. **Prompt 示例网格（Prompt Examples Grid）**
   - 2×3 或类似网格布局
   - 每个示例卡片逐个入场（80ms → 280ms 递增延迟）
   - `od-fade-slide-up 300ms`

7. **Plugin Presets（插件预设列表）**
   - 类似网格布局
   - 逐个入场（60ms → 260ms）

#### 4.4.2 Composer（输入编辑器）

**编辑器外壳（composer-shell）**：
- 边框 `1px solid var(--bg-fill-secondary)` = `rgba(0,0,0,0.06)`
- 背景 `var(--bg-fill-tertiary)` = `rgba(0,0,0,0.03)`
- 圆角 `12px`
- padding `8px 10px 6px`
- **Focus-within**：边框变为 `color-mix(in srgb, var(--accent) 22%, var(--border-strong))`，加 `box-shadow: 0 1px 2px ... + 0 0 0 1px ...`

**编辑器输入区域**：
- Lexical ContentEditable
- 最小高度 72px，最大高度 `min(184px, 34vh)`
- 字号 13.5px，行高 1.6
- 光标色 `var(--accent)` = `#c96442`
- 背景色 `color-mix(in srgb, var(--bg-panel) 94%, var(--bg-subtle))`
- Focus 时背景变为 `var(--bg-panel)`

**底部工具栏（composer-row）**：
- 上方有 `1px solid var(--border-soft)` 分割线
- 包含：`+` 菜单按钮、会话模式切换、spacer、研究模式开关、发送按钮
- 图标按钮 32×32px

**发送按钮（composer-send）**：
- 最小宽度 64px，高度 32px
- 背景 `var(--accent)` = `#c96442`，白色文字
- 字重 650，字号 12.5px，圆角 6px
- `box-shadow: var(--shadow-xs)`
- Hover：`var(--accent-hover)` + `box-shadow: var(--shadow-sm)`
- Active：`translateY(1px)` + `box-shadow: var(--shadow-xs)`
- Focus-visible：`box-shadow: 0 0 0 3px var(--selected-soft)`
- Disabled：`opacity: 0.5`
- **Stop 变体**：`background: var(--text); color: var(--bg-panel)`

**@ Mention 药丸（Inline Mention）**：
- 19px 高，圆角 6px
- 内含类型色点（4px 圆形 + 2px 光晕）
- 字号 12.5px，字重 500
- 各类型颜色映射：
  - Plugin/Skill → accent 橙
  - Design/MCP → purple 紫
  - File → blue 蓝
  - Connector → green 绿
  - Asset → muted 灰
- 选中态：蓝色边框 `var(--selected)`

### 4.5 其他 Entry 视图

#### Projects 视图
- section header + DesignsTab 网格
- 项目卡片带缩略图（iframe/image/video）、元数据行、状态指示

#### DesignSystems 视图
- section header + DesignSystemsTab
- 设计系统卡片列表，支持预览弹窗

#### Plugins 视图（PluginsView）
- 独立路由视图
- 社区插件画廊：搜索、过滤、卡片网格
- 卡片 hover：`translateY(-2px)` + `box-shadow: var(--shadow-sm)` + 边框变深
- 卡片 active：`translateY(0) scale(0.99)`

#### Tasks/Automations 视图
- 指标 hero + 已保存自动化列表 + 模板画廊

#### Integrations 视图
- Tab 切换（MCP / Connectors / Use Everywhere）

---

## 五、ProjectView（项目工作台）

### 5.1 分栏布局

```
┌──────────────┬──┬────────────────────────────────┐
│  Chat Panel  │  │  Workspace / Preview            │
│  (460px)     │拖│                                  │
│              │拽│  ┌──────────────────────────┐    │
│  ┌──────────┐│条│  │ Design Browser /         │    │
│  │ Header   ││  │  │ File Viewer /             │    │
│  │ ← Title  ││  │  │ Artifact Preview           │    │
│  │ DS Picker││  │  │                           │    │
│  ├──────────┤│  │  │  (iframe srcdoc 渲染)     │    │
│  │          ││  │  │                           │    │
│  │ Chat Log ││  │  │                           │    │
│  │          ││  │  │                           │    │
│  │ Messages ││  │  └──────────────────────────┘    │
│  │          ││  │                                  │
│  ├──────────┤│  │  ┌──────────────────────────┐    │
│  │Composer  ││  │  │ Chrome Actions Bar       │    │
│  │          ││  │  │ [Present][Export][Share]  │    │
│  └──────────┘│  │  └──────────────────────────┘    │
└──────────────┴──┴────────────────────────────────┘
```

**Grid 定义**：
```css
grid-template-columns: 460px 8px minmax(400px, 1fr);
```
- Chat 面板固定 460px
- 拖拽条 8px
- Workspace 面板弹性填充（最小 400px）

**拖拽调整（Resize Handle）**：
- 8px 宽，`cursor: col-resize`
- 中间有一条 1px 线（`color-mix(in srgb, var(--border) 92%, transparent)`）
- Hover/Focus 时线变为 `color-mix(in srgb, var(--accent) 70%, var(--border))`
- 过渡动画 140ms

**全屏预览（split-focus）**：
- grid 变为 `minmax(0, 1fr)`，隐藏 chat panel

### 5.2 Chat Panel（聊天面板）

#### 5.2.1 Chat Header（38px）

- 粘性顶部 `position: sticky; top: 0; z-index: 4`
- 背景 `var(--bg-panel)`
- 左侧：返回按钮（28×28px，圆角 6px）
- 中间：可编辑项目标题（13.5px，字重 600，hover 微灰背景，focus 出 box-shadow）
- 右侧：Design System Picker + Session Switcher

#### 5.2.2 Chat Log（消息列表）

- padding `24px 20px`，gap `24px`
- `scrollbar-width: thin`，自定义滚动条
- 消息从底部锚定（`margin-top: auto` 在第一条消息上）

#### 5.2.3 消息样式

**用户消息**：
- 靠右 `align-self: flex-end`
- 最大宽度 `min(78%, 560px)`
- 气泡：`background: var(--bg-fill-tertiary)` = `rgba(0,0,0,0.03)`
- 圆角 `12px`，padding `8px 12px`
- 字号 14.5px，行高 1.5
- hover 时显示时间 + 复制按钮（`opacity: 0 → 1`，过渡 140ms）

**助手消息**：
- 靠左，全宽
- 包含 markdown 渲染的 prose 区域
- 入场动画 `msg-enter: opacity 0→1, translateY(6px→0)，200ms`

**等待指示器（op-waiting）**：
- 圆角 8px 卡片
- 3 个跳动圆点（6px，stagger 120ms）+ 文字标签
- 背景 `color-mix(in srgb, var(--bg-panel) 92%, var(--bg-subtle))`

**错误卡片**：
- 背景 `var(--bg-fill-tertiary)`，圆角 8px
- 重试按钮 + AMR 引导卡片

#### 5.2.4 Composer（聊天输入区）

（样式与首页 composer 相同，见 4.4.2）

额外特性：
- 可拖拽文件上传（drag-active 时边框变为 `var(--accent)`，背景变为 `var(--accent-tint)`）
- Staged attachments 区域（文件缩略图 chips）
- 队列发送列表（queued-send-strip）

### 5.3 Workspace/Preview 面板

#### Design Browser（设计浏览器）
- Chrome 风格地址栏
- 视口切换按钮
- Reference board（过滤工具栏 + 卡片网格）

#### File Viewer
- 代码高亮查看器（Shiki）
- 文件工作区标签栏

#### Artifact Preview
- iframe srcdoc 渲染
- 全屏/展示模式支持
- 缩放菜单（弹出框 `radius-md`，`shadow-md`）

#### Chrome Actions Bar
- 高度 30px，padding `0 12px`，圆角 7px
- 按钮：Present、Export（accent 色）、Share、Zoom
- Export 按钮：`background: var(--accent)`，`box-shadow: 0 6px 14px color-mix(in srgb, var(--accent) 24%, transparent)`
- Primary 变体：`background: var(--text-strong); color: var(--bg)`

---

## 六、交互模式与动画

### 6.1 产品缓动函数

全局使用 **产品缓动**：
```
cubic-bezier(0.23, 1, 0.32, 1)
```

### 6.2 入场动画体系

所有入场动画定义在 `entrance.css`，使用零 JS 开销的纯 CSS keyframes：

| 动画名 | 效果 |
|--------|------|
| `od-fade-in` | 淡入 |
| `od-fade-slide-up` | 淡入 + 上滑 10px |
| `od-fade-slide-down` | 淡入 + 下滑 8px |
| `od-scale-in` | 淡入 + 缩放 0.96→1 |
| `od-popover-in` | 淡入 + 缩放 0.93 + 上移 3px |
| `od-slide-left` | 淡入 + 右滑 16px |

**时序规律**：
- 页面/模块：180-400ms
- 弹出/下拉：140-160ms
- 侧面板滑入：220-250ms
- 模态框：250-280ms

### 6.3 交互动画

| 交互 | 效果 |
|------|------|
| 按钮通用 hover | `background/border-color/color 120ms ease` |
| 按钮通用 focus | `outline: 2px solid var(--accent); offset: 2px` |
| 主按钮 active | `scale(0.97)` 80ms |
| Tab active | `scale(0.98)` 100ms |
| 卡片 hover | `translateY(-2px)` 160ms |
| 卡片 active | `translateY(0) scale(0.99)` |
| Tab 拖拽 | `translateY(-2px) scale(1.015)` + shadow |
| 消息入场 | `translateY(6px) → 0` 200ms |
| 发送按钮 active | `translateY(1px)` 140ms |
| 加载圆点 | 跳动 `translateY(-4px)` 900ms infinite |

### 6.4 减少动画偏好

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```
React 层面：`<MotionConfig reducedMotion="user">`

---

## 七、组件样式细节

### 7.1 按钮（6 种变体）

| 变体 | 背景 | 边框 | 文字 | 圆角 |
|------|------|------|------|------|
| default | `var(--bg-panel)` | `var(--border)` | `var(--text)` | 6px |
| primary | `var(--accent)` | `var(--accent)` | white | 6px |
| primary-ghost | `var(--bg-panel)` | `var(--accent)` | `var(--accent)` | 6px |
| ghost | transparent | `var(--border)` | `var(--text)` | 6px |
| subtle | `var(--bg-subtle)` | transparent | `var(--text)` | 6px |
| icon-btn | (继承) | (继承) | (继承) | 6px, padding 6px 10px |

Disabled：`opacity: 0.5; cursor: not-allowed`

### 7.2 输入框

- 背景 `var(--bg-panel)`，边框 `var(--border)`，圆角 6px
- padding `7px 10px`
- Focus：`border-color: var(--selected); box-shadow: 0 0 0 3px var(--selected-soft)`
- Placeholder：`color: var(--text-faint)`
- 自定义 select 下拉箭头（SVG polyline）

### 7.3 Tooltip

- `position: fixed; z-index: 4000`
- padding `5px 8px`，圆角 6px
- 背景 `var(--bg-elevated)`，阴影 `var(--shadow-sm)`
- 字号 11px，字重 500，行高 1.2

### 7.4 自定义 Select（od-select）

- Trigger：36px 高，grid 布局
- 箭头旋转：expanded 时 `rotate(180deg)` 120ms
- Menu：`z-index: 9000`，圆角 6px，`shadow-lg`
- Option：30px 高，圆角 6px，字号 12.5px
- Selected：`font-weight: 600`，背景 `color-mix(in srgb, var(--selected) 9%, ...)`

### 7.5 头像菜单（AvatarMenu）

- Trigger：58×32px，grid `32px 24px`，圆角 7px
- Avatar 按钮：32×32px 圆形，`linear-gradient(135deg, var(--accent-tint), var(--accent-soft))`
- Hover：`box-shadow: 0 0 0 3px rgba(194,83,45,0.18)`
- Popover：`min-width: 280px`，圆角 8px，`shadow-lg`

### 7.6 Onboarding（首次引导）

**3 步骤流程**：
1. **连接**（Runtime 选择：AMR Cloud / Local CLI / BYOK）
2. **关于你**（角色/团队/用例/来源下拉选择）
3. **Newsletter**（邮箱输入）

**步骤指示器**：ol 列表，active 状态高亮

**选择卡片（OnboardingChoiceCard）**：
- 选中态 `.is-selected`：边框/背景变化
- AMR Cloud 卡片有专属 variant `.onboarding-view__card--amr`
- Featured 卡片有 `.onboarding-view__card--featured`
- 勾选标记 `Icon name="check"` 14px

---

## 八、响应式断点

| 断点 | 行为 |
|------|------|
| ≤900px | Topbar chips 折叠到 settings dropdown |
| ≤880px | Chrome action secondary 隐藏文字，只留图标 |
| ≤720px | Tab 标签折叠为图标（40-44px），Chrome content 隐藏 |

---

## 九、技术栈清单

| 技术 | 版本/说明 |
|------|-----------|
| Next.js | 16 (App Router) |
| React | 18 |
| Tailwind CSS | 4（PostCSS） |
| motion (Framer Motion) | 12+ |
| Lexical | 0.36.x（富文本编辑器） |
| Shiki | 4.1（代码高亮） |
| Lucide React | 1.16（图标） |
| @xterm/xterm | 5.5（终端） |

---

## 十、复刻优先级建议

1. **先搭建 tokens.css** — 色彩、阴影、圆角、字体栈
2. **再搭建 primitives.css** — 按钮、输入框、select、tooltip 基础组件
3. **Workspace Shell + TabsBar** — 最外层框架
4. **EntryView 布局** — 左侧栏 + 顶栏 + HomeHero
5. **Composer 组件** — Lexical 编辑器 + mention + 发送
6. **ProjectView 分栏** — Chat + Preview 拖拽分栏
7. **动画系统** — entrance.css 的 keyframes + 各组件入场时序
8. **暗色主题** — `[data-theme="dark"]` 覆盖
