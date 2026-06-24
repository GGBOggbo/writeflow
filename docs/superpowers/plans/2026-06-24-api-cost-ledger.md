# API Cost Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one authoritative project document that shows product-credit charges, current wxrank request counts, RMB cost ranges, and the formula for AI token cost.

**Architecture:** Keep the full calculation in `docs/api-cost-ledger.md` and place only a short link in `README.md`, so prices and request counts have one maintained source. Derive request counts from the current wxrank routing defaults and label variable calls such as `getcm` as ranges rather than fixed charges.

**Tech Stack:** Markdown, Git, existing TypeScript configuration in `lib/search/wxrank-provider.ts` and `lib/credits-core.ts`.

---

## File Structure

- Create `docs/api-cost-ledger.md`: authoritative cost ledger, calculation assumptions, current tables, AI formula, and maintenance checklist.
- Modify `README.md`: correct the outdated deep-dive count and add a link to the authoritative ledger.

### Task 1: Create the authoritative API cost ledger

**Files:**
- Create: `docs/api-cost-ledger.md`
- Reference: `lib/search/wxrank-provider.ts`
- Reference: `lib/credits-core.ts`
- Reference: `.env.example`

- [ ] **Step 1: Confirm the current defaults and billing stages**

Run:

```bash
rg -n "DEFAULT_DEEP_DIVE_LIMIT|DEFAULT_COMMENT_ARTICLE_LIMIT|QUALIFIED_HISTORY_THRESHOLD|RESULT_LIMIT|AI_STAGES|CREDIT_COST_PER_GENERATION" lib/search/wxrank-provider.ts lib/credits-core.ts
```

Expected: output confirms a history threshold of 5, result limit of 8, deep-dive limit of 4, comment-article limit of 2, and one product credit per generation stage.

- [ ] **Step 2: Create the ledger with explicit calculations**

Create `docs/api-cost-ledger.md` with these sections and values:

```markdown
# API 调用与成本账本

> 最近核对：2026-06-24  
> 计算依据：当前代码默认配置，以及 wxrank 价格说明。供应商调价或调用链变化后需要重新核对。

## 一眼看懂

| 场景 | 产品扣分 | wxrank 请求数 | wxrank 实际成本 |
|---|---:|---:|---:|
| 选题，不开启联网搜索 | 1 项目积分 | 0 | ¥0.00 |
| 选题，当月历史命中 | 1 项目积分 | 5～7 | ¥0.05～¥0.15 |
| 选题，补查上月命中 | 1 项目积分 | 6～8 | ¥0.06～¥0.16 |
| 选题，实时搜索兜底 | 1 项目积分 | 7～9 | ¥0.16～¥0.26 |
| Brief、提纲、正文、标题摘要 | 每次成功生成各 1 项目积分 | 0 次新增 wxrank 请求 | ¥0.00 新增 wxrank 成本 |

“项目积分”是产品内生成额度，不等于 ¥1，也不等于 wxrank 的账户余额。

## wxrank 当前单价

| 接口 | 用途 | 单价 | 当前流程 |
|---|---|---:|---|
| `artlist` | 获取公众号每日爆文列表 | ¥0.01/次 | 使用 |
| `getso` | 实时获取搜一搜文章列表 | ¥0.10/次 | 历史结果不足时使用 |
| `artinfo` | 获取公众号文章内容 | ¥0.01/次 | 最多 4 次 |
| `getcm` | 获取公众号文章留言 | ¥0.05/次 | 最多 2 次 |
| `score` | 获取当前剩余积分 | 免费 | 当前业务流程未调用 |
| `getrk` | 获取文章阅读数据 | ¥0.02/次 | 当前流程未调用 |
| `getps` | 获取公众号推文列表 | ¥0.05/次 | 当前流程未调用 |
| `getsu` | 获取公众号搜索列表 | ¥0.10/次 | 当前流程未调用 |
| `getinfo` | 根据 biz 获取公众号原始 ID | ¥0.05/次 | 当前流程未调用 |
| `getbiz` | 根据 biz 获取公众号基本信息 | ¥0.05/次 | 当前流程未调用 |
| `getpc` | 获取公众号推文列表（短链） | ¥0.05/次 | 当前流程未调用 |

## 公众号选题成本明细

当前默认配置：

- 合格历史结果阈值：5 篇。
- 最终参考结果上限：8 篇。
- `artinfo` 深拆上限：4 篇。
- `getcm` 留言文章上限：2 篇。
- 每篇最多保留 10 条留言。

| 搜索路径 | 固定调用 | 可选调用 | 请求数范围 | 成本计算 | 成本范围 |
|---|---|---|---:|---|---:|
| 当月历史命中 | `artlist × 1 + artinfo × 4` | `getcm × 0～2` | 5～7 | `0.01 + 4×0.01 + (0～2)×0.05` | ¥0.05～¥0.15 |
| 补查上月命中 | `artlist × 2 + artinfo × 4` | `getcm × 0～2` | 6～8 | `2×0.01 + 4×0.01 + (0～2)×0.05` | ¥0.06～¥0.16 |
| 实时搜索兜底 | `artlist × 2 + getso × 1 + artinfo × 4` | `getcm × 0～2` | 7～9 | `2×0.01 + 0.10 + 4×0.01 + (0～2)×0.05` | ¥0.16～¥0.26 |

`getcm` 只有在深拆文章存在 `comment_id` 时才会调用，因此不能把两次留言请求当成每次必然发生。

选题阶段得到的搜索上下文会被后续 Brief、提纲、正文和标题摘要复用，这些阶段不会重新请求 wxrank。

## 产品积分

以下 AI 生成阶段每次成功返回会消耗 1 项目积分：

| 阶段 | 产品扣分 |
|---|---:|
| 生成选题 | 1 |
| 生成 Brief | 1 |
| 生成提纲 | 1 |
| 生成正文 | 1 |
| 生成标题与摘要 | 1 |

生成失败会退回预扣积分。选题内部的搜索意图规划和标杆总结属于同一次产品操作，不额外扣用户项目积分，但仍会产生真实 AI Token 成本。

完整走完五个生成阶段最多消耗 5 项目积分。AI 排版、补充素材等当前不进入上述五个计费阶段，是否调用模型应以对应功能代码和界面提示为准。

## AI 模型成本

AI 人民币成本不能用固定次数准确表示，因为每次输入、搜索资料长度、正文长度、重试次数和输出长度都可能不同。

统一计算公式：

`AI 成本 = 输入 Token ÷ 1,000,000 × 输入单价 + 输出 Token ÷ 1,000,000 × 输出单价`

| AI 请求 | 何时发生 | 产品是否另扣积分 | 当前人民币成本 |
|---|---|---|---|
| 搜索意图规划 | 开启选题联网搜索时 | 否，包含在选题操作中 | 按 Token 计算 |
| 标杆文章总结 | 有合格搜索资料时 | 否，包含在选题操作中 | 按 Token 计算 |
| 生成选题 | 点击生成选题时 | 1 项目积分 | 按 Token 计算 |
| 生成 Brief | 点击生成 Brief 时 | 1 项目积分 | 按 Token 计算 |
| 生成提纲 | 确认 Brief 后 | 1 项目积分 | 按 Token 计算 |
| 生成正文 | 确认提纲后 | 1 项目积分 | 按 Token 计算 |
| 生成标题与摘要 | 正文完成后 | 1 项目积分 | 按 Token 计算 |

在项目尚未记录每次请求的输入/输出 Token 前，不填写猜测的 AI 固定金额。

## 维护检查表

修改下列内容时同步更新本账本：

- `WXRANK_HISTORY_MIN_RESULTS`
- `WXRANK_RESULT_LIMIT`
- `WXRANK_DEEP_DIVE_LIMIT`
- `WXRANK_COMMENT_ARTICLE_LIMIT`
- wxrank 接口单价
- wxrank 搜索路由与重试逻辑
- 产品计费阶段或单次项目积分
- AI 模型和供应商价格

历史设计文档中按 `getcm × 4` 得出的 ¥0.25、¥0.26、¥0.35～¥0.36 已不符合当前代码。当前代码默认最多调用 `getcm × 2`，应以本账本为准。
```

- [ ] **Step 3: Verify the arithmetic and terminology**

Run:

```bash
rg -n "¥0\\.05～¥0\\.15|¥0\\.06～¥0\\.16|¥0\\.16～¥0\\.26|getcm.*0～2|项目积分.*不等于" docs/api-cost-ledger.md
```

Expected: all three cost ranges, the conditional `getcm` range, and the product-credit distinction are present.

- [ ] **Step 4: Commit the ledger**

```bash
git add docs/api-cost-ledger.md
git commit -m "docs: add api cost ledger"
```

### Task 2: Link the ledger and correct the README summary

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the stale deep-dive description**

Replace:

```markdown
    → 选 2 篇标杆调用 artinfo 抓正文 HTML
    → 有 comment_id 再调用 getcm 抓高赞留言
```

with:

```markdown
    → 最多选 4 篇标杆调用 artinfo 抓正文 HTML
    → 其中最多 2 篇在有 comment_id 时调用 getcm 抓高赞留言
```

- [ ] **Step 2: Add a single authoritative ledger link**

After the wxrank flow explanation, add:

```markdown
接口调用次数、产品积分与人民币成本的统一口径见 [API 调用与成本账本](docs/api-cost-ledger.md)。当前默认路由的 wxrank 成本为每次联网选题约 ¥0.05～¥0.26，具体取决于是否补查上月、是否实时兜底以及文章是否带有 `comment_id`。
```

- [ ] **Step 3: Verify README and ledger consistency**

Run:

```bash
rg -n "最多选 4 篇|最多 2 篇|API 调用与成本账本|¥0\\.05～¥0\\.26" README.md
```

Expected: four matching lines and no remaining statement that only two articles receive `artinfo`.

- [ ] **Step 4: Check Markdown and whitespace**

Run:

```bash
git diff --check
```

Expected: no output and exit code 0.

- [ ] **Step 5: Commit the README correction**

```bash
git add README.md
git commit -m "docs: link current api cost figures"
```

### Task 3: Final cross-check

**Files:**
- Verify: `docs/api-cost-ledger.md`
- Verify: `README.md`

- [ ] **Step 1: Confirm only intended files changed**

Run:

```bash
git status --short
```

Expected: clean working tree after both documentation commits.

- [ ] **Step 2: Confirm the current code matches the documented limits**

Run:

```bash
npx vitest run lib/search/wxrank-provider.test.ts app/api/ai/ai-routes.test.ts
```

Expected: all selected tests pass, including assertions that `artinfo` is called four times, `getcm` is called at most twice, and successful AI routes consume product credits.

- [ ] **Step 3: Review the final diff history**

Run:

```bash
git log -3 --oneline
```

Expected: the design commit followed by the ledger and README documentation commits.
