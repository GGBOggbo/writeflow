# Pino 日志链路管理设计

## 目标

将当前面向终端阅读的字符串日志升级为可在 Vercel 中检索、聚合和串联的结构化 JSON 日志，并为后续接入 Axiom、Better Stack 等平台保留稳定的数据结构。

一期需要解决：

- 一次 HTTP 请求内的日志可以通过 `requestId` 串联。
- 选题到标题摘要的跨请求工作流可以通过 `workflowId` 串联。
- 积分预扣、消耗、退款和重试可以通过现有 `operationId` 串联。
- 并发请求之间的上下文不会串线。
- 业务模块无需层层手动传递 logger。
- 日志不会输出密钥、Cookie、正文、评论、完整 Prompt 等敏感内容。

一期不接入外部日志平台，不引入 OpenTelemetry，不实现分布式 span 导出。

## 技术选择

- 使用 Pino 作为服务端结构化日志器。
- 使用 Node.js `AsyncLocalStorage` 保存当前请求的日志上下文。
- 开发环境可使用 `pino-pretty` transport；Vercel 和生产环境直接输出单行 JSON 到 stdout/stderr。
- 保留现有 `lib/debug.ts` 的 `log.info/debug/warn/error` 调用方式作为兼容层，逐步迁移为稳定事件名。

参考的本地 Pino 项目为 `~/data/project/pino`，当前版本 `10.3.1`。本设计采用其 child logger、redaction 和 transport 能力，但链路上下文由业务项目实现。

## 三层标识

### `requestId`

- 表示一次服务端 HTTP 请求。
- 由服务端为每次 API 请求生成 UUID。
- 不复用前端 `useWorkflow` 中用于防止旧响应覆盖新状态的递增数字 `requestId`。
- 写入响应头 `X-Request-Id`，方便浏览器错误与服务端日志对照。
- 如 Vercel 提供 `x-vercel-id`，单独记录为 `platformRequestId`，不替代 `requestId`。

### `workflowId`

- 表示一篇稿件从选题到标题摘要的完整工作流。
- 由客户端在新工作流创建时生成 UUID，并保存到 `WorkflowState` 与本地持久化状态。
- 每次 AI 请求通过 `X-Workflow-Id` 请求头发送。
- 服务端只接受合法 UUID；缺失或非法时生成临时 UUID，并记录 `workflowIdSource=generated`。
- 响应始终写入 `X-Workflow-Id`；客户端收到服务端替换值时更新当前工作流状态。
- 用户清空并开启新稿时生成新的 `workflowId`；页面刷新恢复同一稿件时继续使用原值。

### `operationId`

- 沿用现有请求体中的 UUID。
- 继续承担积分幂等和重试身份，不由日志系统重新生成。
- 同一次失败重试继续使用原 `operationId`，不同付费步骤使用不同 `operationId`。
- 日志 ID 不能替代积分数据库的唯一约束。

## 日志上下文

新增服务端上下文类型：

```ts
type LogContext = {
  requestId: string;
  workflowId: string;
  workflowIdSource: "client" | "generated";
  operationId?: string;
  stage?: AiStage;
  route?: string;
  userIdHash?: string;
  platformRequestId?: string;
};
```

- 使用 `AsyncLocalStorage<LogContext>` 保存上下文。
- API 包装器完成参数解析和鉴权后，将 `operationId`、`stage` 和不可逆的 `userIdHash` 加入上下文。
- `userIdHash` 使用 `LOG_HASH_SECRET` 对用户 ID 执行 HMAC-SHA256，并截取前 16 个十六进制字符，不记录原始用户 ID、邮箱或姓名。
- 生产环境缺少 `LOG_HASH_SECRET` 时省略 `userIdHash` 并只警告一次，不能回退为原始用户 ID，也不能阻断请求。
- 日志器通过 Pino `mixin` 或调用时合并上下文，让已有深层模块自动获得链路字段。
- 没有上下文时仍允许输出日志，并增加 `contextMissing: true`，不能因此阻断业务。

## 文件职责

### `lib/logging/logger.ts`

- 使用 `server-only` 限制日志实现只能进入服务端 bundle。
- 创建唯一的 Pino 根日志器。
- 读取 `LOG_LEVEL`。
- 配置生产 JSON 输出和开发 `pino-pretty`。
- 配置统一 redaction。
- 提供底层结构化写入能力。

### `lib/logging/context.ts`

- 使用 `server-only`，底层采用 `node:async_hooks` 的 `AsyncLocalStorage`。
- 创建 `AsyncLocalStorage`。
- 提供 `runWithLogContext()`、`getLogContext()` 和受控的上下文扩展方法。
- 不依赖 Next.js，便于单元测试并防止业务模块与框架耦合。

### `lib/logging/request-context.ts`

- 从请求头读取并校验 `X-Workflow-Id`。
- 生成 `requestId` 和必要时生成 `workflowId`。
- 提取 `x-vercel-id`。
- 将 API 路径和请求方法写入上下文。

### `lib/debug.ts`

- 改为 Pino 的兼容适配器。
- 保持现有调用签名，避免一次性修改所有业务日志。
- 将 `scope` 写为结构化字段，将 message 写入 `msg`。
- 新代码优先使用稳定的 `event` 字段。

### API 包装器

- `app/api/ai/_shared.ts` 和 `app/api/ai/_stream.ts` 负责创建并维持日志上下文。
- 这些路由明确使用 Node.js runtime，不将 Pino 或 `AsyncLocalStorage` 打入 Edge runtime。
- JSON 和流式请求使用同一套生命周期事件。
- 流式 `ReadableStream.start()` 内显式重新进入同一个上下文，不能依赖回调稍后执行时的隐式传播。

## 标准日志模型

所有新日志遵循以下顶层结构：

```json
{
  "level": 30,
  "time": 1781260800000,
  "service": "wechat-writing-workflow",
  "environment": "production",
  "event": "topic.search.completed",
  "scope": "wxrank",
  "stage": "topics",
  "status": "succeeded",
  "requestId": "...",
  "workflowId": "...",
  "operationId": "...",
  "durationMs": 842,
  "provider": "wxrank",
  "msg": "wxrank realtime search completed"
}
```

稳定字段：

- `event`：机器检索用的点分事件名。
- `scope`：代码模块，例如 `api`、`credits`、`ai`、`search`、`wxrank`。
- `stage`：`topics`、`brief`、`outline`、`draft`、`humanize`、`meta`。
- `status`：`started`、`succeeded`、`failed`、`skipped`、`degraded`。
- `durationMs`：阶段耗时。
- `provider`、`model`、`attempt`：外部调用信息。
- `count`、`rawCount`、`retainedCount` 等：结果计数。
- `errorType`、`errorCode`、`retryable`：安全错误摘要。

禁止将动态值拼入 `event`。例如路由值写成：

```ts
event: "search.route.selected",
route: "realtime-fallback"
```

而不是 `event: "route=realtime-fallback"`。

## 关键链路事件

### API 请求

- `api.request.started`
- `api.request.validation_failed`
- `api.request.unauthorized`
- `api.request.completed`
- `api.request.failed`
- `api.stream.closed`

请求完成日志包含 HTTP 状态、总耗时和是否为流式请求，不记录请求体。

### 积分

- `credits.reserve.started`
- `credits.reserve.succeeded`
- `credits.reserve.conflict`
- `credits.consume.succeeded`
- `credits.refund.succeeded`
- `credits.refund.failed`

只记录 stage、操作状态、耗时和余额计数，不记录数据库 SQL 或用户原始身份。

### AI

- `ai.request.started`
- `ai.request.succeeded`
- `ai.request.retrying`
- `ai.request.failed`
- `ai.response.parse_failed`

记录 provider、model、attempt、maxTokens、耗时和可用的 token usage。删除完整 Prompt 和模型返回预览日志，改为：

- `systemPromptChars`
- `userPromptChars`
- `responseChars`
- `promptHash`，仅在确有排障价值时使用不可逆短哈希

### 搜索

- `search.plan.completed`
- `search.provider.started`
- `search.provider.completed`
- `search.filter.completed`
- `search.route.selected`
- `search.deep_dive.selected`
- `search.article_info.completed`
- `search.comments.completed`
- `search.context.prepared`

保留当前选题阶段已经实现的计数、排名、来源、命中词和保留理由，但改为结构化事件。

## 生命周期示例

一次选题请求的日志顺序：

```text
api.request.started
credits.reserve.started
credits.reserve.succeeded
search.plan.completed
search.provider.started
search.filter.completed
search.route.selected
search.deep_dive.selected
search.context.prepared
ai.request.started
ai.request.succeeded
credits.consume.succeeded
api.request.completed
api.stream.closed
```

以上日志共享相同的 `requestId`、`workflowId` 和 `operationId`。

下一步策略单请求使用新的 `requestId` 和 `operationId`，但继续使用相同 `workflowId`。

## 脱敏策略

Pino 根日志器配置初始化时固定的 redaction paths，不允许由用户输入动态生成。

至少覆盖：

```text
authorization
cookie
set-cookie
password
secret
token
apiKey
headers.authorization
headers.cookie
request.headers.authorization
request.headers.cookie
body.draftContent
body.articleHtml
body.comments
prompt.systemPrompt
prompt.userPrompt
response.content
```

同时遵循：

- 不把 Request、Response、session 或用户对象整体传给 logger。
- 不把用户控制的对象直接作为 child logger 顶层 bindings。
- 标题、搜索词和错误摘要先移除换行并限制长度。
- 错误日志只记录安全类型、代码和内部映射后的消息；不直接序列化第三方响应。
- 开发 `debug` 级别也不得绕过脱敏规则。

## Pino child logger 使用边界

- 根 logger 固定 `service`、`environment` 和版本信息。
- 模块可创建固定 bindings 的 child logger，例如 `{ scope: "wxrank" }`。
- 请求链路字段来自 `AsyncLocalStorage`，不为每个深层函数手动创建和传递 child logger。
- 禁止用用户输入对象创建 child logger，避免覆盖 `level`、`time`、`msg`、`requestId` 等保留字段。

## 输出与 Transport

### 本地开发

- 默认使用 `pino-pretty`，显示时间、级别、事件、stage 和三个 ID 的短格式。
- 支持 `LOG_FORMAT=json` 强制查看生产格式。

### Vercel/生产

- 直接输出单行 JSON。
- 不在请求线程内同步调用第三方日志 API。
- 第一阶段依赖 Vercel 日志查询。

### 后续平台接入

- 通过 Pino transport 或平台日志 drain 接入。
- 外部发送、格式转换和告警处理放在独立线程、进程或平台 drain 中。
- 业务事件字段和调用点不因平台变化而修改。

## 错误与降级

- 日志上下文创建失败时生成最小上下文继续请求。
- `lib/debug.ts` 兼容层捕获日志写入异常，日志方法本身不得成为业务失败原因。
- pretty transport 初始化失败时回退到 JSON stdout。
- 外部 transport 不可用时只影响日志上报，不影响 AI、搜索或积分结算。
- 流式连接中断记录 `api.stream.closed` 和结束原因；已经完成的积分状态仍按现有业务规则处理。
- `credits.refund.failed` 必须记录，但不能覆盖原始生成错误。

## 客户端工作流 ID

- `WorkflowState` 新增 `workflowId`。
- `createInitialWorkflowState()` 创建 UUID。
- 恢复旧版 localStorage 数据且没有 `workflowId` 时自动补生成。
- 清空当前稿件时创建新 ID。
- 重试当前步骤时沿用相同 `workflowId` 和原 `operationId`。
- `lib/ai/client.ts` 的 `postJsonStream()` 新增独立 `workflowId` 参数，统一写入 `X-Workflow-Id`，不把它混入 AI 请求体。
- `postJsonStream()` 读取响应中的 `X-Workflow-Id`，通过回调将服务端确认后的值写回工作流状态。
- 所有公开 AI client 方法都要求调用者传入当前 `workflowId`，避免从浏览器全局变量隐式读取。

## 迁移顺序

1. 安装 `pino`，开发依赖安装 `pino-pretty`。
2. 阅读当前 Next.js 版本位于 `node_modules/next/dist/docs/` 的 server-only、route handler、Node runtime 和 bundling 相关文档。
3. 新增 logger、AsyncLocalStorage 和请求上下文模块。
4. 将 `lib/debug.ts` 改为兼容适配器，保持现有业务可运行。
5. 给 JSON/流式 AI API 包装器接入三层 ID 和请求生命周期日志。
6. 给客户端状态和请求头接入 `workflowId`。
7. 给积分边界增加稳定事件。
8. 将 AI provider 的完整 Prompt/响应预览改为安全统计。
9. 将搜索与 wxrank 日志迁移为稳定事件名。
10. 补充文档和 Vercel 查询示例。

## 测试

### Logger

- 不同级别正确过滤。
- Pino 输出是单行 JSON。
- redaction 覆盖嵌套密钥、Cookie、正文、Prompt 和评论。
- 开发 transport 失败时可以降级。

### 上下文

- `runWithLogContext` 内的同步和异步日志均包含三层 ID。
- 两个并发 Promise 的上下文相互隔离。
- 无上下文日志带 `contextMissing=true`。
- 嵌套扩展 stage/operationId 后不会污染父上下文。

### API

- 合法 `X-Workflow-Id` 被沿用，非法或缺失值被替换。
- 响应包含 `X-Request-Id`。
- 校验失败、未登录、积分不足、成功和生成失败均有完整生命周期日志。
- JSON 与流式路由行为一致。
- 流式回调执行时上下文仍存在。

### 客户端

- 同一稿件所有步骤发送相同 `workflowId`。
- 清空新稿后 ID 改变。
- 页面刷新恢复后 ID 不变。
- 失败重试继续使用原 `workflowId` 和 `operationId`。

### 安全

- 测试放入可识别的假密钥、正文、评论和 Prompt，断言日志输出中均不存在。
- 用户输入无法覆盖 Pino 保留字段或链路 ID。

## 验收标准

- 在 Vercel 中使用任一 `workflowId` 能检索到一篇稿件跨阶段的日志。
- 使用 `requestId` 能还原一次 API 请求从进入、积分、搜索、AI 到结束的顺序。
- 使用 `operationId` 能确认一次付费步骤是否预扣、消耗或退款。
- 并发请求日志不会串 ID。
- 生产日志不再出现完整 Prompt、模型响应预览、正文、评论、Cookie 或密钥。
- 现有业务流程、积分幂等和搜索行为不发生变化。
