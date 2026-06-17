# wf-* 扩展至 33 个模块 — 设计清单

> 目标:原创 33 个 wf-* 模块(现有 8 + 新增 25),全部用 Writeflow 自己的语法和 HTML。
> 纪律:对齐 DESIGN.md——强调色 ≤3 处/屏、描边环+浅底块+微信安全内联样式、阅读节奏优先。
> **不抄 md2wechat 的 HTML 结构/class/data 属性**,只借鉴"哪些场景需要模块"的需求分类。

---

## 设计原则(每个模块都要满足)

1. **场景驱动,非组件驱动**:模块名描述"阅读任务"(引入/转折/总结),不是 web 组件(tab/accordion)
2. **字段可追溯原文**:所有字段必须来自原文,排版不造内容(承接 prompt 硬约束)
3. **视觉三件套**:只用描边环/浅底块/纯色边框,禁 grid 堆叠外的一切危险布局
4. **强调色守恒**:每个模块最多用 1 处强调色(编号/标签/竖线),保证全屏 ≤3

---

## 全 33 模块清单(按文章生命周期分组)

### A. 开场与结构(8 个,已有 3 + 新增 5)

| 模块 | 状态 | kind | 用途 | 字段/列 |
|---|---|---|---|---|
| `wf-lead` | ✅已有 | fields | 开场导语 | body(必),label,title |
| `wf-section` | ✅已有 | fields | 章节标题 | index(必),title(必),subtitle |
| `wf-toc` | 🆕 | rows | 文章目录 | index\|title\|anchor |
| `wf-part` | 🆕 | fields | 大部分割(几部分) | label(必),title(必) |
| `wf-divider` | 🆕 | fields | 纯视觉分隔(无文字) | ornament(必:dot/line/star) |
| `wf-hook` | 🆕 | fields | 钩子/悬念开场 | body(必),teaser |

### B. 引用与强调(5 个,已有 2 + 新增 3)

| 模块 | 状态 | kind | 用途 | 字段/列 |
|---|---|---|---|---|
| `wf-pullquote` | ✅已有 | fields | 金句引用 | quote(必),label,source |
| `wf-note` | ✅已有 | fields | 提醒注意 | body(必),label,title |
| `wf-quote` | 🆕 | fields | 长引用(带背景块) | body(必),source |
| `wf-highlight` | 🆕 | fields | 关键句强调 | body(必),label |
| `wf-aside` | 🆕 | fields | 旁注/补充说明 | body(必),label |

### C. 列举与对比(5 个,已有 3 + 新增 2)

| 模块 | 状态 | kind | 用途 | 字段/列 |
|---|---|---|---|---|
| `wf-points` | ✅已有 | rows | 并列要点 | index\|heading\|body |
| `wf-steps` | ✅已有 | rows | 步骤说明 | index\|heading\|body |
| `wf-compare` | ✅已有 | rows | 左右对比 | side\|heading\|body |
| `wf-proscons` | 🆕 | rows | 优缺点对照 | side(优势/局限)\|item\|detail |
| `wf-checklist` | 🆕 | rows | 清单/核对项 | item\|checked(✓/✗)\|note |

### D. 数据与证据(5 个,全新增)

| 模块 | 状态 | kind | 用途 | 字段/列 |
|---|---|---|---|---|
| `wf-metric` | 🆕 | fields | 单个关键数据 | value(必),label,unit |
| `wf-stats` | 🆕 | rows | 多数据并列 | value\|label\|delta |
| `wf-timeline` | 🆕 | rows | 时间线 | time\|event\|detail |
| `wf-quote-evidence` | 🆕 | fields | 证据引用(用户/专家原话) | body(必),source,role |
| `wf-case` | 🆕 | fields | 单个案例 | title(必),body(必),result |

### E. 互动与问答(3 个,全新增)

| 模块 | 状态 | kind | 用途 | 字段/列 |
|---|---|---|---|---|
| `wf-faq` | 🆕 | fields | 单个问答 | question(必),answer(必) |
| `wf-question` | 🆕 | fields | 向读者提问 | body(必),hint |
| `wf-prompt` | 🆕 | fields | 行动提示(非 CTA,温和) | body(必),label |

### F. 人物与来源(3 个,全新增)

| 模块 | status | kind | 用途 | 字段/列 |
|---|---|---|---|---|
| `wf-author` | 🆕 | fields | 作者卡 | name(必),role,bio |
| `wf-source` | 🆕 | fields | 来源标注 | title(必),publisher,url |
| `wf-people` | 🆕 | rows | 多人物简介 | name\|role\|note |

### G. 视觉与收尾(4 个,已有 1 + 新增 3)

| 模块 | 状态 | kind | 用途 | 字段/列 |
|---|---|---|---|---|
| `wf-image-note` | ✅已有 | fields | 图片说明 | image(必),title,body,alt |
| `wf-gallery` | 🆕 | rows | 多图并排 | src\|caption |
| `wf-callout` | 🆕 | fields | 总结性提示框 | body(必),label |
| `wf-signoff` | 🆕 | fields | 文末结束语 | body(必),signature |

---

## 实现批次(避免一次铺太大)

按价值分 3 批实现,每批可独立提交:

- **批次 1**(高频):wf-toc, wf-quote, wf-highlight, wf-faq, wf-metric, wf-timeline, wf-callout, wf-signoff(8 个)
- **批次 2**(常用):wf-hook, wf-part, wf-divider, wf-aside, wf-proscons, wf-stats, wf-case, wf-author(8 个)
- **批次 3**(补充):wf-checklist, wf-question, wf-prompt, wf-quote-evidence, wf-source, wf-people, wf-gallery, wf-proscons, wf-divider(9 个,含调整)

> 注:批次 3 含微调,最终精确凑 25 个新增 → 总数 33。

## 每个模块的渲染规格(HTML)

全部遵循:
- 外层 `<section data-writeflow-module="wf-xxx" style="...token...">`
- 文字色走 `T.colors.text`,强调走 `T.colors.accent`,次要走 `T.colors.muted`
- 卡片用描边环 `box-shadow:0 0 0 1px border`
- 强调块用浅底 `background:accentPale`
- 禁:grid(除 compare)、transform、animation、伪元素、外部 class
