# Writeflow 排版设计系统 DESIGN.md

> 角色:Writeflow `wf-*` 排版渲染器的设计契约。
> 地位:与 `claude/DESIGN.md` 同级——本文件是排版视觉的唯一事实来源。
> 方法论来源:Open Design 的四层 token 分级 + md2wechat 实测不塌的视觉手段。
> 原则:**先定契约,再改代码**。本文件未变更前,渲染器改动视为越界。

---

## 0. 为什么需要这份文件

Writeflow 的排版经历过 10+ 次重做(见 VIBECODING-RETROSPECTIVE.md)。
根因是每次重做都没有"Done 标准",目标函数一直漂移。

本文件的存在就是为了终结漂移:**视觉决策一旦写进这里,就是契约**。
- 渲染器实现必须对齐本文件
- AI prompt 必须对齐本文件
- 任何"再加点效果"的冲动,先回答"它进了哪条 MUST"

---

## 1. 核心约束(不可协商)

### 1.1 复制不塌是第一优先级
用户已实测:md2wechat 的 grid/linear-gradient/box-shadow 复制进公众号后台**不塌**。
因此"微信不支持这些 CSS"**不是技术事实,是被推翻的假设**。

但本设计系统仍保留克制,理由不是"怕塌",而是**"阅读舒适 > 视觉炫技"**——
这是产品定位(公众号长文阅读续读),不是技术恐惧。

### 1.2 单一事实源
- 排版视觉的色值/间距/圆角 → 全部来自 `lib/formatting/format-tokens.ts`
- 渲染器**禁止硬编码 hex**(必须走 token)
- AI prompt**禁止描述具体颜色**(只描述"强调""次要")

### 1.3 内容不可变
排版只改呈现,不改内容。本文件不讨论写作质量,那是 prompt/spec 的事。

---

## 2. Token 四层分级(借自 Open Design)

Writeflow 的 token 不再是扁平的,按"谁决定 / 能否省略"分四层:

| 层 | 含义 | Writeflow 例子 | 能否省略 |
|---|---|---|---|
| **A1-identity** | Writeflow 身份,不可替代 | 正文色、强调色、字体栈 | ❌ 必填 |
| **A2** | 有合理默认,可被未来主题覆盖 | 语义色、基础间距、圆角 | ✅ 有 fallback |
| **B-slot** | 可别名到兄弟 token | `muted` → 次要文字层级 | ✅ 自动别名 |
| **C-extension** | 主题专属 | (当前无,留给未来主题) | ⚠️ 白名单 |

### 2.1 当前 token 归层(WRITEFLOW_EDITORIAL_TOKENS)

| token | 当前值 | 层 | 说明 |
|---|---|---|---|
| `colors.text` | `#2a241f` | A1-identity | 正文,暖近黑 |
| `colors.muted` | `#6f6258` | A1-identity | 次要文字 |
| `colors.accent` | `#a45a3f` | A1-identity | **强调色,全屏 ≤3 处** |
| `colors.accentStrong` | `#7e3f2d` | A2 | 强调 hover/加深 |
| `colors.accentSoft` | `#f4ebe4` | A2 | 强调背景 tint |
| `colors.accentPale` | `#fbf7f2` | A2 | 提醒块浅底 |
| `colors.surface` | `#fffdf9` | A1-identity | 卡片底 |
| `colors.border` | `#eaded3` | A1-identity | 默认边框 |
| `font` | 系统字体栈 | A1-identity | 不用外部字体(微信限制) |
| `radius.*` | 6/8/8/999px | A2 | 圆角 |

### 2.2 待补 token(当前缺失,导致视觉单调)

以下 token 是 wf-* 当前"看起来素"的根因——它们该有但没系统化:

| 待加 token | 用途 | 默认值 | 为什么需要 |
|---|---|---|---|
| `colors.divider` | 行间分隔线 | `#eaded3`(暂同 border) | 让 wf-points 的分隔线有独立语义 |
| `shadow.ring` | **描边环深度** | `0 0 0 1px var(--border)` | Open Design 的核心深度手段,比 drop-shadow 安全 |
| `shadow.raised` | 轻微浮起 | `0 2px 8px rgba(42,36,31,0.06)` | 卡片浮起感,md2wechat 实测不塌 |
| `surface.tinted` | 浅色背景块 | `#f4ebe4`(同 accentSoft) | wf-note/wf-pullquote 的背景块 |

---

## 3. 强调色使用纪律(借自 claude 设计系统)

claude 规定 `--accent` 全屏 ≤2 次使用(lint 强制)。
Writeflow 放宽到 **≤3 处**,因为公众号模块密度比 web 高,但仍是硬约束。

### 3.1 强调色的"合法用途"(只有这几种)
1. 章节编号(wf-section 的 `01`)—— 文字色
2. 金句左竖线(wf-pullquote)—— 边框色
3. 行模块的编号(wf-points/wf-steps/wf-compare)—— 文字色

### 3.2 强调色的"禁止用途"
- ❌ 普通正文大面积染色
- ❌ 多个模块同时用强调色背景(会变成"卡片墙")
- ❌ 标题整段染强调色(只有编号可以)

### 3.3 验证方式
渲染任意一篇文章后,统计 `#a45a3f`(及变体)出现次数。
- ≤3 处:通过
- 4-6 处:警告,需复核
- ≥7 处:失败,渲染器违规

---

## 4. 视觉手段允许清单(替代之前的"禁止清单")

旧 spec 用"禁止清单"(禁 grid/禁渐变/禁阴影)→ 过度保守。
新设计系统改用**"允许清单"**:明确哪些可以用、用到什么程度。

### 4.1 ✅ 允许(微信实测保留)

| 手段 | 用法 | 限制 |
|---|---|---|
| **纯色背景块** | `background:#fbf7f2` | 用于提醒/金句块,不用于整段正文 |
| **实色边框** | `border:1px solid #eaded3` | 卡片轮廓,不用双边框 |
| **圆角** | `border-radius:6-8px` | 卡片/图片,不用超大圆角 |
| **描边环** | `box-shadow:0 0 0 1px #eaded3` | Open Design 式深度,比阴影安全 |
| **轻微浮起** | `box-shadow:0 2px 8px rgba(...,0.06)` | 仅卡片级,不用多层阴影 |
| **左竖线装饰** | `border-left:3px solid #a45a3f` | 金句/提醒,已有 |
| **左侧粗色块** | 已用于 wf-note | 可推广 |
| **渐变** | `linear-gradient(180deg,#f4ebe4,#fffdf9)` | **仅卡片背景浅渐变**,不用 135deg/多色 |
| **两列网格** | `grid-template-columns:1fr 1fr` | 仅 wf-compare/wf-points 并列项,不用 auto-fit |

### 4.2 ❌ 仍禁止(不是怕塌,是不适合阅读)

| 手段 | 原因 |
|---|---|
| 多层阴影叠加 | 公众号长文不需要立体感,会显得"网页化" |
| `transform` 变形 | 阅读场景无意义,增加渲染负担 |
| 动画/transition | 公众号阅读无交互,纯静态 |
| `position:absolute` 复杂定位 | 粘贴易错位,且阅读不需要 |
| 伪元素装饰 `::before` | 微信部分版本剥离,不可靠 |

---

## 5. 模块视觉规格(每个 wf-* 的 Done 标准)

> 以下规格是**契约**:渲染器输出必须符合。不符合 = bug。

### wf-lead(开场)
- ✅ 顶部 1px 细线分隔(已有)
- ✅ label(强调色小字)+ title(加粗)+ body(正文)
- 🆕 **加**:整体可选用 `accentPale` 浅底块(可选,非必须)

### wf-section(章节)
- ✅ 大号强调色编号 + 加粗标题 + 灰色副说明(已有)
- 🆕 **加**:编号可加描边环圆角背景块(强调编号视觉权重)

### wf-pullquote(金句)
- ✅ 左 3px 强调色竖线 + 加粗金句 + 出处(已有)
- 🆕 **加**:`accentPale` 浅底块包裹,让金句"沉下来"

### wf-points / wf-steps(并列/步骤)
- ⚠️ 当前:只有底部细线分隔,太素
- 🆕 **改**:每行用描边环卡片(`box-shadow:0 0 0 1px`)替代纯分隔线,增强扫描感
- 编号用强调色
- ⚠️ **约束**:禁止 `display:grid`(现有测试 `advanced-module-render.test.ts` 强制断言 `not.toContain("display:grid")`)。points/steps 必须保持堆叠,不并排

### wf-compare(对比)
- ⚠️ 当前:和 points 视觉相同
- 🆕 **改**:两列网格(左右对照),每列浅底卡片,第一列用 side 标签区分

### wf-note(提醒)
- ✅ 左竖线 + 浅底块(已有,质量最高)
- 保持

### wf-image-note(图片说明)
- ✅ 全宽圆角图 + 标题 + 说明(已有)
- 🆕 **加**:图片下方可加描边环 caption 块(可选)

---

## 6. Done 标准(本文件定义的"够用了")

排版系统的"完成"= 以下全部满足:

### 6.1 量化标准(可自动验证)
- [ ] 强调色出现 ≤3 处/屏
- [ ] 所有色值来自 token,0 硬编码 hex
- [ ] 渲染器无 `transform`/`animation`/`::before`
- [ ] 每个模块的 HTML 符合第 5 节规格

### 6.2 主观标准(人工验证)
- [ ] wf-points 不再是"几行文字",有卡片扫描感
- wf-compare 能一眼看出"两个对照项"
- [ ] 整篇文章复制进公众号后台,手机预览不塌
- [ ] 整体感觉"值得读完",不是"网页卡片墙"

### 6.3 反 Done(明确不要的)
- ❌ 追求 md2wechat 那种 31 模块的丰富度(本系统刻意保持小)
- ❌ 加 hero/verdict/cta 这类"网页组件"(wf-* 是阅读节奏,不是网页)
- ❌ 为了"好看"破坏强调色纪律

---

## 7. 变更规则

本文件是契约,不是笔记。修改本文件 = 重新评审排版系统。

- 任何"再加个效果"的冲动 → 必须先回答:它进第 4 节哪条?还是第 6.3 反 Done?
- token 值修改 → 必须同步 `format-tokens.ts` + 测试
- 新增模块 → 必须先写进第 5 节规格,再写代码

**历史教训**:Writeflow 排版重做 10+ 次,每次都是"觉得不够好就推倒"。
本文件的存在就是为了让第 11 次不会发生——除非先改这份契约。
