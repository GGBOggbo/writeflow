# wxrank 路由日志设计

## 目标

让开发与线上排障日志明确显示一次选题搜索使用了历史库、实时搜索，还是混合路径，同时避免泄露 API key、文章正文和完整接口响应。

## 日志级别

- `info`：记录接口、搜索关键词、月份、原始结果数、合格结果数和最终路由。
- `debug`：记录脱敏后的 AI 搜索计划，以及结果被质量闸门过滤的数量。
- `warn`：记录某个月份 `artlist` 失败或 `getso` 失败但流程仍能降级继续。
- `error`：只有没有任何可用结果、整个 wxrank 搜索失败时才由现有 search service 输出。

## 输出格式

```text
[wxrank] → artlist | {"month":"202606","keyword":"GPT 职场"}
[wxrank] → artlist completed | {"month":"202606","raw":50,"qualified":3}
[wxrank] → getso | {"keyword":"GPT-5.6 普通员工 职场转型"}
[wxrank] → getso completed | {"raw":20,"qualified":6}
[wxrank] → route=realtime-fallback | {"historyQualified":4,"realtimeQualified":6,"final":8}
```

历史库足够时：

```text
[wxrank] → route=history-only | {"historyQualified":6,"realtimeQualified":0,"final":6}
```

## 路由命名

- `history-only`：只调用历史库，历史结果达到阈值。
- `history-extended`：调用当前月和上月历史库后达到阈值，未调用实时接口。
- `realtime-fallback`：调用实时接口，最终结果全部来自实时搜索。
- `mixed`：调用实时接口，最终结果同时包含历史与实时结果。

## 安全边界

- 不输出 wxrank API key。
- 不输出请求 headers、完整 URL 查询串或接口响应体。
- 不输出文章正文、评论内容或完整搜索结果。
- 关键词允许输出，因为它来自用户搜索意图，但长度限制为 120 字符并移除换行。
