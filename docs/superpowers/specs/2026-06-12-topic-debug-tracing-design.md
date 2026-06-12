# 选题阶段 Debug 追踪日志设计

## 目标

让一次选题请求从搜索意图规划、wxrank 检索、结果筛选、排序、文章深挖到最终提示词组装都可追踪。日志应回答“保留了哪些文章、为什么保留、调用了哪些接口、最终有多少参考内容进入模型”，同时不泄露密钥、文章正文或评论原文。

## 范围

只增强选题阶段的结构化日志，不改变搜索路由、相关性筛选、排序、深挖数量或模型提示词行为。

## 日志内容

### 1. 选题请求开始与结束

开始时记录输入预览、搜索是否启用和搜索提供商。结束时汇总规划、搜索、生成和总耗时，以及生成的选题数量。

```text
[topics] -> start | {"ideaPreview":"Claude神话模型","searchEnabled":true,"searchProvider":"wxrank"}
[topics] <- completed | {"plannerMs":2200,"searchMs":3100,"generationMs":14100,"totalMs":19400,"topicCount":5}
```

输入预览最长 120 字符并移除换行。

### 2. 搜索意图规划

记录规划来源是 AI 还是规则降级、规划耗时和脱敏后的结构化计划。额外记录 AI 计划相对用户输入新增的数字年份等可疑限定词，便于发现模型擅自收窄搜索范围。

```text
[topics] -> search plan | {"source":"ai","elapsedMs":2200,"historicalKeyword":"Claude","realtimeKeyword":"Claude 神话模型 2025","addedTerms":["2025"]}
```

### 3. wxrank 检索与筛选

保留现有 `artlist`、`getso` 和最终路由日志，并增加每次接口调用耗时。筛选完成后记录原始数、保留数、淘汰数及淘汰原因汇总，但不打印被淘汰文章的标题。

```text
[wxrank] -> getso completed | {"raw":20,"retained":9,"rejected":11,"elapsedMs":850,"rejectedReasons":{"missingRequiredTerm":7,"insufficientRelevance":4}}
```

### 4. 保留文章与排序

只打印最终保留文章。每篇包含排名、标题、数据来源、命中词、相关度分数和保留原因。标题和原因使用长度限制，禁止输出摘要或正文。

```text
[wxrank] -> retained result | {"rank":1,"origin":"realtime","title":"Claude 神话模型为什么突然火了","matchedTerms":["Claude","神话模型"],"score":18,"reasons":["命中核心词","标题高度相关"]}
```

`origin` 只允许 `history` 或 `realtime`，用于区分历史库和实时接口。

### 5. 深挖接口

记录进入深挖的文章及选择原因，以及 `artinfo`、`getcm` 的调用结果和耗时：

- `artinfo`：文章标题、是否成功、正文字符数、是否取得 `comment_id`。
- `getcm`：文章标题、是否调用、原始评论数和最终保留评论数。
- 单篇失败：使用 `warn`，记录安全错误类型，流程继续处理其他文章。
- 没有 `comment_id`：明确记录 `getcm` 被跳过。

不得打印文章正文、评论原文、请求头或完整 API 响应。

### 6. 最终参考池

在调用选题模型前记录搜索结果构成和实际进入提示词的规模：

```text
[topics] -> reference context | {"searchResults":8,"history":2,"realtime":6,"promptReferences":4,"withHtml":2,"withComments":1,"contextChars":9200}
```

这能明确区分“搜索返回 8 篇”和“提示词实际使用 4 篇”。

## 日志级别

- `info`：阶段开始/结束、接口调用、路由、最终参考池、总耗时。
- `debug`：搜索计划、保留文章、筛选原因汇总、深挖选择依据。
- `warn`：规划降级、单个 wxrank 接口失败、深挖失败。
- `error`：沿用现有整体请求失败日志。

## 安全与体积限制

- 不输出 API key、Authorization、Cookie、数据库地址或 OAuth 配置。
- 不输出文章正文、评论内容、完整接口响应或被淘汰文章标题。
- 用户输入、标题、关键词和原因字段统一移除换行并限制长度。
- 保留文章日志最多 8 条，深挖日志最多 2 篇。
- 继续保留现有 AI prompt debug 日志，本次不扩大其内容范围。

## 测试

- 单元测试验证筛选原因计数和保留文章日志字段。
- Provider 测试覆盖历史、实时、混合及深挖成功/跳过/失败路径。
- AI service 测试覆盖规划来源、参考池统计和阶段耗时字段。
- 测试断言日志中不出现 API key、正文或评论原文。

