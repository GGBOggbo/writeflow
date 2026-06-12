# Writeflow — 主编陪跑型 AI 共创工作台

把一个想法逐步打磨成可发布稿件的 AI 写作工作台。

## 功能概览

- **7 步写作工作流**：想法 → 选题 → 提纲 → 大纲 → 正文 → 标题摘要 → 定稿
- **双面板编辑器**：左侧主编台 + 右侧成稿工作台
- **状态机驱动**：每一步的状态转换都有严格的前置条件校验
- **本地持久化**：所有进度自动保存在 localStorage，刷新不丢失
- **多 AI 提供商**：支持 Mock（默认回退）、Mimo（小米）、OpenAI、Anthropic
- **联网搜索增强**：选题阶段可选联网搜索，后续阶段自动复用搜索上下文

## 技术栈

| 技术 | 版本 |
|------|------|
| Next.js | 16.2.7 |
| React | 19.2 |
| TypeScript | 5.x |
| Tailwind CSS | 4.x |
| Zod | 4.x |
| Vitest | 4.x |

## 快速开始

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local

# 启动开发服务器
npm run dev
```

打开 http://localhost:3000 即可使用。

## 环境变量

在 `.env.local` 中配置：

```bash
# AI 提供商：mock | mimo | openai | anthropic
AI_PROVIDER=mock

# Mimo（小米）
MIMO_API_KEY=
MIMO_MODEL=mimo-v2.5-pro
MIMO_BASE_URL=https://token-plan-cn.xiaomimimo.com/v1

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=

# Anthropic
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=

# 搜索提供商：disabled | bocha | jizhila | wxrank
SEARCH_PROVIDER=disabled

# wxrank（公众号搜索，推荐）
WXRANK_API_KEY=
WXRANK_BASE_URL=https://data.wxrank.com
WXRANK_HISTORY_MIN_RESULTS=5
WXRANK_RESULT_LIMIT=8
WXRANK_DEEP_DIVE_LIMIT=2
WXRANK_COMMENT_TOP_N=10

# 机智拉（公众号搜索）
JIZHILA_API_KEY=
JIZHILA_VERIFY_CODE=

# 搜索增强开关
JIZHILA_ENRICH_READ_ZAN=false
JIZHILA_ENRICH_LIMIT=5
JIZHILA_ENRICH_ARTICLE_HTML=false
JIZHILA_ENRICH_ARTICLE_LIMIT=2
JIZHILA_ENRICH_COMMENTS=false
JIZHILA_ENRICH_COMMENT_LIMIT=2
JIZHILA_ENRICH_COMMENT_TOP_N=10
```

## 写作工作流

```
想法输入 → 选题生成 → Brief 确认 → 大纲审阅 → 正文生成 → 标题摘要 → 定稿出稿
  ①          ②           ③          ④          ⑤          ⑥          ⑦
```

| 步骤 | 说明 |
|------|------|
| ① 想法 | 把要写的命题说清楚 |
| ② 选题 | AI 生成 3 个选题方向，用户选择一个 |
| ③ 提纲 | 生成创作策略单（目标/受众/人设/语气） |
| ④ 大纲 | 搭建文章骨架和素材槽位 |
| ⑤ 正文 | 基于大纲生成完整初稿 |
| ⑥ 包装 | 生成 5 个标题 + 3 条摘要 + 封面建议 |
| ⑦ 定稿 | 选择最终版本，一键复制 |

## 联网搜索

当前搜索规则：

| 阶段 | 联网搜索 | 说明 |
|------|---------|------|
| 选题 | 用户可选 | 实时搜索公众号文章 |
| 提纲 | 自动复用 | 复用选题搜索结果 |
| 大纲 | 自动复用 | 复用选题搜索结果 |
| 正文 | 永远断网 | 保护成稿真实感 |
| 标题摘要 | 自动复用 | 复用选题搜索结果 |

wxrank 搜索增强流程：

```
artlist 当前月（历史库，低成本）
    → 不足 5 篇再查上月 artlist
    → 仍不足 5 篇才调用 getso 实时搜索
    → 合并去重后最多保留 8 篇
    → 选 2 篇标杆调用 artinfo 抓正文 HTML
    → 有 comment_id 再调用 getcm 抓高赞留言
    → 后续策略单、大纲、正文、标题摘要复用同一份参考池
```

wxrank 会把极致了旧链路里的 `web_search/read_zan_pro/article_html/article_comment2` 平替为 `artlist/getso/artinfo/getcm`。历史库自带阅读、点赞、在看和分享数据，因此历史命中时不再额外调用阅读互动接口。

## AI 提供商

### Mock（默认）

开箱即用的回退模式，不需要任何 API Key，返回固定假数据。

### Mimo（小米）

第一个完全接入的真实 AI 提供商，通过 OpenAI 兼容接口调用小米 MiMo 模型。需要配置 `MIMO_API_KEY`。

### OpenAI / Anthropic

已占位，尚未完全接入。缺少 API Key 时会返回明确错误提示。

## 项目结构

```
app/
  api/ai/           # API 路由层（topics / brief / outline / draft / meta）
  layout.tsx         # 根布局（zh-CN）
  page.tsx           # 首页入口

components/
  stages/            # 各阶段 UI 组件（idea / topic / brief / outline / draft / meta / final）
  hooks/
    use-workflow.ts  # 工作流核心 Hook（状态管理 + API 调用）
  app-client.tsx     # 客户端根组件
  workspace-shell.tsx # 双面板容器
  chat-panel.tsx     # 左侧主编台
  manuscript-panel.tsx # 右侧成稿工作台

lib/
  ai/                # AI 服务层
    service.ts       # 服务入口（搜索 + 模型调用）
    provider.ts      # 提供商接口
    real-provider.ts # Mimo 实现
    prompts/         # 各阶段 Prompt 模板
    schemas.ts       # Zod 请求/响应校验
  search/            # 搜索增强层
    service.ts       # 搜索服务入口
    jizhila-provider.ts  # 机智拉搜索提供商
    jizhila-selection.ts # 智能文章筛选和打分
    normalize.ts     # 搜索结果标准化
  state-machine.ts   # 工作流状态机
  storage/           # localStorage 持久化

types/
  workflow.ts        # 工作流类型（状态、事件、数据模型）
  ai.ts              # AI 接口类型（输入/输出契约）
```

## 测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 代码检查
npm run lint

# 构建
npm run build
```

## License

MIT
