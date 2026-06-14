# md2wechat 模块设计知识参考

> **来源**:`~/data/project/md2wechat-skill` 的 `internal/assets/builtin/layout/`(43 个模块 yaml),用脚本结构化提取。
> **性质**:设计知识(serves 框架 + 取舍逻辑),**非渲染代码**——渲染在 md2wechat 付费服务端,不在此处。
> **License 边界**:md2wechat 是 Source Available(个人免费 / 商业需授权)。本文件仅作**设计思路参考**,勿照抄模块命名与渲染做商业产品。serves 四框架(attention / readability / memorability / conversion)是通用内容设计概念,非其独创。
> **用途**:为 [format-draft.ts](../lib/ai/prompts/format-draft.ts) 的语义标注 prompt 提供取舍依据,缓解 98% paragraph 退化(见 [v2 设计 spec](superpowers/specs/2026-06-13-wechat-formatting-v2-design.md))。

## serves 四框架

每个模块标注它服务的阅读目的(可多选),分布:
- **readability**(28):让手机端阅读更易
- **attention**(19):帮读者判断这篇值不值得读
- **memorability**(15):让一个判断 / 金句 / 数字被记住
- **conversion**(13):引导保存 / 关注 / 咨询 / 分享 / 购买

## 本项目 8 语义块 ↔ md2wechat 模块映射

| 本项目块 | md2wechat 对应 | 建议补的高价值块 |
|---|---|---|
| quote | quote / quote-card / tweet | quote-card(大字金句,开头立主张/结尾升华) |
| cta | cta / subscribe / resource-list | subscribe(关注引导,区别于 cta) |
| pain | callout / notice / myth-fact / verdict | myth-fact(纠误区)、verdict(作者立场) |
| transition | bridge / part / label-title | bridge(解释下段为何重要) |
| comparison | compare / comparison-table | (已够) |
| list | steps / checklist / timeline / faq | timeline(演进路径)、checklist(收藏型) |
| heading | hero / cards / toc / part / manifesto | hero(开篇 3 秒钩子)、manifesto(长期主张) |
| paragraph | (无对应) | metrics / stat-row(数字展示,可选) |

> **不适用本项目**(商业落地页模块,观点文用不上):pricing / specs / logos / cases / author-card / people。

## 43 模块总览(按 category)

| name | category | serves | body_format | position |
|---|---|---|---|---|
| author-card | brand | memorability/conversion | fields | closing |
| people | brand | memorability/readability | rows | body |
| series | brand | memorability/conversion | fields | opening |
| subscribe | brand | conversion/memorability | fields | closing |
| cases | conversion | conversion/attention | rows | body |
| checklist | conversion | readability/conversion | rows | body |
| cta | conversion | conversion | fields | closing |
| faq | conversion | conversion/readability | rows | body |
| logos | conversion | conversion/memorability | rows | body |
| notice | conversion | readability/attention | rows | body |
| pricing | conversion | conversion | rows | body |
| specs | conversion | readability/conversion | rows | body |
| summary | conversion | memorability/readability | fields | closing |
| toolbox | conversion | conversion/readability | rows | body |
| image-annotate | evidence | readability/attention | fields | body |
| image-compare | evidence | attention/readability | fields | body |
| image-steps | evidence | readability | rows | body |
| image-text | evidence | readability | fields | body |
| quote | evidence | attention/memorability | fields | body |
| compare | infographic | readability/attention | rows | body |
| infographic | infographic | attention/memorability | fields | body |
| metrics | infographic | attention/memorability | rows | body |
| steps | infographic | readability | rows | body |
| timeline | infographic | readability | rows | body |
| audience-fit | judgment | attention/readability | fields | opening |
| bridge | judgment | readability | fields | body |
| manifesto | judgment | attention/memorability | fields | opening |
| myth-fact | judgment | attention/readability | rows | body |
| verdict | judgment | attention/memorability | fields | body |
| cards | opening | attention/readability | rows | opening |
| hero | opening | attention/readability | fields | opening |
| label-title | opening | readability | fields | body |
| part | opening | readability | fields | body |
| toc | opening | readability | rows | opening |
| callout | sprint4 | attention/readability | rows | body |
| changelog | sprint4 | readability/memorability | json_object | body |
| comparison-table | sprint4 | readability/attention | json_object | body |
| definition | sprint4 | readability | json_object | body |
| question | sprint4 | readability/conversion | json_array | body |
| quote-card | sprint4 | attention/memorability | json_object | opening |
| resource-list | sprint4 | readability/conversion | json_array | closing |
| stat-row | sprint4 | attention/memorability | json_array | body |
| tweet | sprint4 | attention/memorability | json_object | body |

## 取舍精华(用 ↔ 避)—— 改 format prompt 的直接弹药

- **author-card**:用 建立作者身份和关注理由;避 纯数据报告/教程不需要
- **people**:用 展示团队/角色/嘉宾/服务对象;避 单人介绍用 author-card
- **series**:用 告诉读者这是一组连续内容,建立系列感;避 单篇独立文章不需要
- **subscribe**:用 文章结尾的关注/收藏/转发引导;避 文章中间不要放
- **cases**:用 案例/成果/客户场景;避 团队成员介绍用 people
- **checklist**:用 发布前检查/执行清单/收藏型;避 纯步骤说明用 steps
- **cta**:用 结尾互动区,提示保存/套用/继续;避 关注引导用 subscribe
- **faq**:用 常见疑问/风险解释/购买顾虑;避 只有 1-2 个问题直接写正文
- **logos**:用 品牌墙/客户墙/合作方;避 有具体结果数据时用 cases
- **notice**:用 适用说明/风险/前提/不适用场景;避 简单提示用 callout
- **pricing**:用 方案报价/套餐差异/版本选择;避 案例用 cases,参数用 specs
- **specs**:用 参数/交付范围/配置;避 功能对比用 compare
- **summary**:用 一句话总结,章节末/文末;避 多点总结用 checklist
- **toolbox**:用 资源/模板/工具链接;避 纯链接列表用 resource-list
- **image-annotate**:用 图片重点标注(截图/页面/海报);避 无重点用 image-text
- **image-compare**:用 前后对比图/A-B 方案;避 纯文字对比用 compare
- **image-steps**:用 带图片的教学步骤;避 无图步骤用 steps
- **image-text**:用 图片+解释同区;避 多图对比用 image-compare
- **quote**:用 金句/引文/观点强调;避 大段引用直接用 blockquote
- **compare**:用 比较旧方式/新方式、方案 A/B;避 单维度对比用 infographic type:contrast
- **infographic**:用 把一个判断/金句/数字/路径做成文字视觉摘要;避 超过一个核心点拆成多个
- **metrics**:用 关键数字/结果/变化;避 单个数字用 infographic type:data
- **steps**:用 执行步骤/方法论流程/落地顺序;避 带图步骤用 image-steps
- **timeline**:用 阶段/时间/演进路径;避 步骤用 steps,版本日志用 changelog
- **audience-fit**:用 告诉读者适合谁/不适合谁,放前段;避 受众明确的垂直内容不需要
- **bridge**:用 解释下一段为何重要,避免观点突跳到证据/价格/行动;避 逻辑连贯时不需要
- **manifesto**:用 建立作者长期主张,个人品牌/专栏开头结尾;避 纯教程/数据报告不适合
- **myth-fact**:用 纠正常见误区,观点文/产品解释/方案说服;避 没明确误区别强行用
- **verdict**:用 把作者立场单独拎出,观点文/复盘/方案结论;避 纯数据报告不需要
- **cards**:用 开头快速列出结构/重点/分工/速览;避 只有 1-2 个点不需要
- **hero**:用 开篇第一屏,3 秒内判断值不值得读;避 纯流水信息(日报)、纯数据(用 metrics)
- **label-title**:用 小节入口,正文中轻量切主题;避 需明显章节感用 part
- **part**:用 大段落切换,建立章节感;避 短文不需要
- **toc**:用 长文开头给阅读路径,3 章节以上;避 短文(2 章以内)不需要
- **callout**:用 重要提示/警告/成功确认/危险操作;避 多条注意用 notice
- **changelog**:用 产品迭代/开源日志/版本说明;避 时间线用 timeline
- **comparison-table**:用 方案对比/选型/优缺点;避 多行多维度用 compare
- **definition**:用 术语解释/概念定义/行业词汇;避 多术语批量用列表或 specs
- **question**:用 FAQ/读者问题/学习测验;避 商业顾虑处理用 faq
- **quote-card**:用 文章开头立主张、收尾升华、大字金句;避 普通引用用 quote
- **resource-list**:用 延伸阅读/工具推荐/参考资料;避 需分类说明用 toolbox
- **stat-row**:用 核心指标/数据报告/产品参数;避 纵向数据用 metrics
- **tweet**:用 社交媒体引用/用户评价/名人观点;避 普通引用用 quote

## 下一步

把"取舍逻辑"融进 [format-draft.ts](../lib/ai/prompts/format-draft.ts) 的类型定义(让 AI 标注时知道反向边界,减少 paragraph 退化)——见后续 spec。
