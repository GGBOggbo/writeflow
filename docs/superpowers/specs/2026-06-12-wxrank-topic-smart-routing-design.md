# wxrank 选题智能路由设计

## 目标

将公众号选题参考池从极致了迁移到 wxrank，在不降低选题参考质量的前提下降低单次选题的数据接口成本。

本次只调整公众号搜索和参考素材获取链路，不改前端工作流、用户积分规则、AI 提示词和选题输出结构。密钥仅通过 `WXRANK_API_KEY` 环境变量提供，不进入源码、日志或版本库。

## 当前链路

当前选题阶段调用极致了 `web_search` 获取文章，再按配置补充阅读互动数据、文章 HTML 和留言。搜索结果生成 `SearchReferenceBundle`，后续策略单、大纲、正文和标题阶段继续复用同一份参考池。

因此，替换的兼容边界是现有 `SearchProvider` 和 `SearchResult`，上层 AI 服务不感知提供方变化。

## 路由方案

采用“历史库优先，实时搜索兜底”的串行路由：

1. 调用 wxrank `artlist` 查询当前月份，关键词使用现有选题搜索 query。
2. 对结果执行发布时间过滤、关键词相关性评分、链接去重和无效数据剔除。
3. 若合格结果不足 5 篇，再调用上一个自然月的 `artlist`。
4. 合并两次历史结果，仅保留最近 30 天内的文章。
5. 若合格历史文章达到 5 篇，停止搜索，不调用实时接口。
6. 若仍不足 5 篇，调用 `getso` 实时搜索。
7. 合并历史与实时结果，按链接去重并排序，最多向上层返回 8 篇。

“历史库有结果”不能只判断接口数组非空。只有经过质量过滤后至少保留 5 篇，才视为历史池命中。

## 质量判定

历史文章必须同时满足：

- `title`、`art_url` 和 `pub_time` 有效。
- 发布时间位于调用时刻向前 30 天内。
- 标题或正文包含搜索 query 中至少一个有效核心词。
- 与已保留文章不存在相同标准化链接。

相关性排序使用轻量规则，不增加 AI 调用：

- 标题命中核心词的权重高于正文命中。
- 命中核心词数量越多，相关性越高。
- 相关性相同时，优先阅读量和互动量更高的文章。
- 最后以发布时间较新者优先。

实时 `getso` 结果缺少互动指标，但保留摘要、公众号名称和发布时间。它只负责补足历史库未覆盖的小众词或新话题，不覆盖已有的高质量历史结果。

## 字段映射

### `artlist`

- `title` -> `SearchResult.title`
- `content` 截断后 -> `SearchResult.snippet`
- `art_url` -> `SearchResult.url`
- `pub_time` -> `SearchResult.publishedAt`
- `read_num`、`like_num`、`look_num`、`share_num` -> `engagementMetrics`
- `wx_type`、`copyright` -> `notes`

### `getso`

- `title` -> `SearchResult.title`
- `desc` -> `SearchResult.snippet`
- `art_url` -> `SearchResult.url`
- `pub_time` -> `SearchResult.publishedAt`
- `wx_name` -> `notes`

所有带高亮标签的标题和摘要都必须清理 HTML 后再进入提示词。

## 深拆链路

为保持当前正文阶段对标效果，参考池生成后继续选择最多 2 篇标杆文章，但完全改用 wxrank：

1. `artlist` 已自带阅读、点赞、在看和分享数据，不再调用 `getrk`。
2. 对选中的 2 篇调用 `artinfo`，获得完整 HTML、长链接和 `comment_id`。
3. 对拥有 `comment_id` 的标杆文章调用 `getcm`，最多处理 2 篇。
4. 留言按置顶和点赞数排序，只保留现有配置要求的前 N 条。

若文章来自 `getso`，同样先通过 `artinfo` 获取完整信息，再获取留言。

## 成本边界

按照当前 wxrank 计费：

| 场景 | 调用 | 预计积分 |
| --- | --- | ---: |
| 当前月历史池直接命中 | `artlist` 1 次 + `artinfo` 2 次 + `getcm` 2 次 | 13 |
| 补查上月后命中 | `artlist` 2 次 + `artinfo` 2 次 + `getcm` 2 次 | 14 |
| 历史不足，实时兜底 | 上述调用 + `getso` 1 次 | 23-24 |

只有接口成功返回业务状态 `code = 0` 才计为有效调用。应用不根据返回的余额文本参与业务判断。

## 提供方结构

新增独立的 wxrank provider，保留现有 `SearchProvider` 接口：

- `wxrank-client.ts`：HTTPS 请求、超时、响应校验和错误类型。
- `wxrank-provider.ts`：智能路由、字段映射、深拆编排和进度事件。
- `wxrank-ranking.ts`：核心词提取、相关性评分、时间过滤与去重。

`search/service.ts` 增加 `SEARCH_PROVIDER=wxrank` 分支。极致了 provider 暂不删除，作为快速回滚选项，但生产环境切换到 wxrank。

默认基础地址必须是 `https://data.wxrank.com`。生产环境拒绝使用明文 HTTP，以免泄露 API Key。

## 失败与降级

- 当前月 `artlist` 失败：直接尝试上月历史查询。
- 两次历史查询均失败或不足 5 篇：调用 `getso`。
- `getso` 失败但历史池非空：返回已有历史文章，状态仍可降级但不阻断选题生成。
- 所有搜索均失败：沿用现有 `degraded` 空参考池，让 AI 在无搜索上下文下继续生成。
- 单篇 `artinfo` 或 `getcm` 失败：保留该文章的基础信息和已有互动数据，不让整次选题失败。
- wxrank `code = 1000`：记录“供应商积分不足”的服务端错误，不向前端暴露 API Key 或原始响应正文。
- wxrank `code = 9999`：不立即并发重试；深拆调用受接口 QPS 限制控制，并进行一次有退避的重试。

## 可观测性

服务端记录以下非敏感指标：

- 路由结果：`history_current`、`history_previous`、`realtime_fallback`、`degraded`。
- 当前月、上月、实时结果数量以及去重后的最终数量。
- 每个接口的成功、业务失败和超时次数。
- 单次选题估算消耗的 wxrank 积分。

日志不得记录 API Key、完整请求体、完整文章正文或留言用户信息。

## 测试要求

单元测试覆盖：

- 当前月得到 5 篇时不调用上月和 `getso`。
- 当前月不足 5 篇、合并上月达到 5 篇时不调用 `getso`。
- 两个月合并仍不足 5 篇时调用 `getso` 并正确去重。
- 30 天边界、无效日期、重复链接和 HTML 高亮清理。
- `artlist` 互动字段及 `getso` 来源字段映射。
- 只对最多 2 篇调用 `artinfo` 和 `getcm`。
- `comment_id` 缺失时跳过 `getcm`。
- HTTP 错误、业务错误、超时和积分不足均能安全降级。
- API Key 不出现在抛给上层的错误消息中。

集成测试继续验证 `generateTopics` 获得的 `SearchReferenceBundle` 结构不变，且后续工作流能够复用该参考池。

## 验收标准

- 生产配置为 `SEARCH_PROVIDER=wxrank` 时，选题流程不再调用极致了接口。
- 历史合格结果达到 5 篇时，绝不调用 `getso`。
- 历史不足时，实时结果能补齐并与历史结果合并。
- 返回给上层的文章不超过 8 篇，字段兼容现有提示词。
- 当前已有搜索、AI 服务和完整工作流测试通过。
- 任何日志、源码、测试快照和 Git 提交中均不存在真实 wxrank 密钥。
