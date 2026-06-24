import Link from "next/link";

const WORKFLOW_STEPS = [
  { no: "01", name: "想法", desc: "把要写的命题说清楚，不用急着拟标题。" },
  { no: "02", name: "选题", desc: "AI 给 3 个方向，你挑出最值得展开的切口。" },
  { no: "03", name: "策略单", desc: "定目标、受众、人设和语气，后面才不跑偏。" },
  { no: "04", name: "大纲", desc: "搭文章骨架，标出需要补真实素材的位置。" },
  { no: "05", name: "正文", desc: "基于大纲生成初稿，保留真实感，不联网。" },
  { no: "06", name: "标题摘要", desc: "拆 5 个标题、3 条摘要和封面建议。" },
  { no: "07", name: "定稿", desc: "选定版本，一键复制，直接粘贴发布。" },
] as const;

const FEATURES = [
  {
    title: "双面板编辑器",
    desc: "左侧主编台持续引导你的判断，右侧成稿台实时预览公众号排版，改哪段预览跟着滚。",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <rect x="3" y="4" width="7" height="16" rx="1.5" />
        <rect x="14" y="4" width="7" height="16" rx="1.5" />
        <path d="M5.5 8h2M5.5 11h2M16.5 8h2M16.5 11h2M16.5 14h2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "联网搜索增强",
    desc: "选题阶段先理解意图，走 wxrank 历史优先路由，历史库自带阅读点赞数据，不足才实时兜底。",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.2-3.2" strokeLinecap="round" />
        <path d="M8.5 11h5M11 8.5v5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Claude 暖纸排版",
    desc: "30 种高级模块（封面卡、金句、FAQ、价格表），羊皮纸暖色调，复制到公众号不变形。",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "积分计费",
    desc: "每阶段首次生成免费，同一阶段重新生成扣 0.05 积分。失败自动退还，搜索规划不额外扣费。",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M14.5 9.2A3.6 3.6 0 0 0 12 8c-1.7 0-3 .9-3 2.3 0 3.2 6 1.6 6 4.8 0 1.5-1.4 2.9-3.5 2.9a4 4 0 0 1-3-1.4" strokeLinecap="round" />
        <path d="M12 6v2.5M12 15.5V18" strokeLinecap="round" />
      </svg>
    ),
  },
] as const;

const PRINCIPLES = [
  {
    title: "主编陪跑，不是一键生成",
    desc: "每一步都让你做决策。AI 在受限范围内组装，你掌握方向和最终判断权。",
  },
  {
    title: "封杀 AI 机器腔",
    desc: "生硬连词、工整排比、金句升华——六种机器套路直接拦截，保留人话的温度。",
  },
  {
    title: "素材不编造",
    desc: "没有真实经历的地方留占位符，强制你补充，绝不让 AI 凭空捏造案例和数据。",
  },
] as const;

const FAQS = [
  {
    q: "免费额度用完了怎么办？",
    a: "注册即送 5 项目积分。选题、Brief、大纲、正文、标题摘要这五个阶段首次生成免费；同一工作流同一阶段重新生成成功后扣 0.05 积分。AI 排版和补充素材不消耗积分。额度用完后可联系管理员充值。",
  },
  {
    q: "生成失败会扣积分吗？",
    a: "不会。系统采用预扣-确认机制，只有 AI 成功返回结果才确认扣费。任何失败（网络超时、AI 报错）都会自动退还积分。",
  },
  {
    q: "生成的稿件可以直接发公众号吗？",
    a: "可以。正文支持 Markdown 排版，一键复制为公众号富文本格式，粘贴到公众号编辑器即可保持样式。支持 30 种高级排版模块。",
  },
  {
    q: "AI 会编造我没经历过的故事吗？",
    a: "不会。正文生成时，需要真实素材的地方会留占位符【💡需要你补充】，强制你补上自己的真实经历、数据或案例，AI 绝不替你编造。",
  },
] as const;

function PrimaryCTA({ label = "免费开始使用" }: { label?: string }) {
  return (
    <Link
      href="/login"
      className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--accent-ink)] px-7 text-base font-bold leading-none text-[#fff] shadow-[0_10px_24px_rgba(35,48,68,0.18)] transition hover:-translate-y-0.5 hover:bg-[#1a2432] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#5f7993]/25"
      style={{ color: "#fff" }}
    >
      {label}
    </Link>
  );
}

export function LandingPage() {
  return (
    <main className="mx-auto w-full max-w-[1140px] px-4 py-6 md:px-6 md:py-10">
      {/* ── Hero（黄金首屏）── */}
      <header className="editorial-card editorial-card-strong editorial-texture relative overflow-hidden rounded-[36px] px-6 py-12 md:px-12 md:py-16">
        <div className="absolute inset-y-0 right-0 hidden w-[34%] bg-[radial-gradient(circle_at_top_right,rgba(207,220,235,0.5),transparent_58%),linear-gradient(180deg,rgba(255,255,255,0.32),transparent)] lg:block" />
        <div className="relative max-w-3xl">
          <p className="editorial-kicker text-xs font-semibold text-[var(--accent-warm)]">
            AI 主编陪跑 · 公众号写作工作台
          </p>
          {/* 唯一 H1：承诺型公式 —— 谁 + 时间 + 结果 */}
          <h1 className="mt-4 text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-[var(--accent-ink)] md:text-6xl">
            七步走完，
            <br />
            从想法到可发布的稿件。
          </h1>
          <p className="editorial-copy mt-6 max-w-xl text-base leading-relaxed text-stone-600 md:text-lg">
            像真人主编一样带你走完创作全流程。每一步都有 AI 辅助组装，
            但方向和判断权在你手里。不联网编造，不输出机器腔，只帮你写出有人味的稿件。
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <PrimaryCTA />
            <span className="text-sm text-stone-500">
              注册即送 5 次生成额度，无需信用卡
            </span>
          </div>
        </div>
        {/* 半屏设计：下方露出工作流板块的边缘，诱导下滑 */}
        <div className="relative mt-10 h-px bg-gradient-to-b from-[var(--accent-warm)]/15 to-transparent md:mt-14" />
      </header>

      {/* ── 7 步工作流 ── */}
      <section className="mt-16 md:mt-20">
        <div className="text-center">
          <p className="editorial-kicker text-xs font-semibold text-[var(--accent-warm)]">
            七步陪跑
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--accent-ink)] md:text-4xl">
            从想法到定稿，每一步都稳
          </h2>
          <p className="editorial-copy mx-auto mt-4 max-w-2xl text-sm text-stone-600">
            不可跳步，每步都有前置校验。上层的选择层层收敛，成为下层 AI 的上下文。
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {WORKFLOW_STEPS.map((step) => (
            <div
              key={step.no}
              className="editorial-card relative flex flex-col rounded-[24px] p-5"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-muted)] text-xs font-bold text-[var(--accent-warm)]">
                  {step.no}
                </span>
                <span className="ml-auto text-[var(--accent-warm)]/40">→</span>
              </div>
              <h3 className="mt-3 text-base font-semibold text-[var(--accent-ink)]">
                {step.name}
              </h3>
              <p className="mt-1.5 text-xs leading-5 text-stone-500">
                {step.desc}
              </p>
            </div>
          ))}
        </div>

        {/* 中段 CTA */}
        <div className="mt-10 text-center">
          <PrimaryCTA label="体验七步工作流" />
        </div>
      </section>

      {/* ── 核心功能 ── */}
      <section className="mt-16 md:mt-24">
        <div className="text-center">
          <p className="editorial-kicker text-xs font-semibold text-[var(--accent-warm)]">
            核心能力
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--accent-ink)] md:text-4xl">
            不只是生成文字
          </h2>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="editorial-card editorial-texture relative overflow-hidden rounded-[28px] p-6"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,rgba(95,121,147,0.1),rgba(108,139,116,0.08))] text-[var(--accent-warm)]">
                  <span className="h-5 w-5">{feature.icon}</span>
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--accent-ink)]">
                    {feature.title}
                  </h3>
                  <p className="editorial-copy mt-2 text-sm leading-relaxed text-stone-600">
                    {feature.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 产品理念 ── */}
      <section className="mt-16 md:mt-24">
        <div className="editorial-soft rounded-[36px] px-6 py-12 md:px-12 md:py-16">
          <div className="text-center">
            <p className="editorial-kicker text-xs font-semibold text-[var(--accent-warm)]">
              产品理念
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--accent-ink)] md:text-4xl">
              为什么不是一键生成
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {PRINCIPLES.map((principle, index) => (
              <div
                key={principle.title}
                className="editorial-card rounded-[24px] p-6"
              >
                <span className="editorial-kicker text-2xl font-bold text-[var(--accent-warm)]/30">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-base font-semibold text-[var(--accent-ink)]">
                  {principle.title}
                </h3>
                <p className="editorial-copy mt-2 text-sm leading-relaxed text-stone-600">
                  {principle.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 定价 ── */}
      <section className="mt-16 md:mt-24">
        <div className="text-center">
          <p className="editorial-kicker text-xs font-semibold text-[var(--accent-warm)]">
            定价
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--accent-ink)] md:text-4xl">
            先免费试用，满意再继续
          </h2>
        </div>

        <div className="mx-auto mt-10 grid max-w-3xl gap-5 md:grid-cols-2">
          {/* 免费版 */}
          <div className="editorial-card relative rounded-[28px] p-8">
            <h3 className="text-lg font-semibold text-[var(--accent-ink)]">
              免费体验
            </h3>
            <p className="mt-2 text-4xl font-bold tracking-tight text-[var(--accent-ink)]">
              ¥0
            </p>
            <p className="mt-1 text-sm text-stone-500">注册即送</p>
            <ul className="mt-6 space-y-3 text-sm text-stone-600">
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent-olive)]">✓</span>
                5 次 AI 生成额度（选题/大纲/正文等）
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent-olive)]">✓</span>
                AI 排版和补充素材（免费不限次）
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent-olive)]">✓</span>
                30 种公众号排版模块
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent-olive)]">✓</span>
                Claude 暖纸主题预览
              </li>
            </ul>
            <div className="mt-8">
              <PrimaryCTA />
            </div>
          </div>

          {/* 付费版 */}
          <div className="editorial-card editorial-card-strong editorial-texture relative rounded-[28px] p-8">
            <span className="absolute right-6 top-6 rounded-full bg-[var(--accent-ink)] px-3 py-1 text-xs font-semibold text-white">
              推荐
            </span>
            <h3 className="text-lg font-semibold text-[var(--accent-ink)]">
              按需充值
            </h3>
            <p className="mt-2 text-4xl font-bold tracking-tight text-[var(--accent-ink)]">
              ¥1<span className="text-base font-normal text-stone-500">/次</span>
            </p>
            <p className="mt-1 text-sm text-stone-500">每次 AI 生成</p>
            <ul className="mt-6 space-y-3 text-sm text-stone-600">
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent-olive)]">✓</span>
                包含免费版全部功能
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent-olive)]">✓</span>
                联网搜索增强（wxrank 历史优先）
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent-olive)]">✓</span>
                失败自动退还积分
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent-olive)]">✓</span>
                搜索规划不额外扣费
              </li>
            </ul>
            <div className="mt-8">
              <Link
                href="/login"
                className="inline-flex items-center rounded-full border border-[var(--accent-ink)]/20 bg-white px-7 py-3.5 text-sm font-semibold text-[var(--accent-ink)] transition hover:-translate-y-0.5 hover:bg-[var(--surface-muted)]"
              >
                注册后联系充值
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mt-16 md:mt-24">
        <div className="text-center">
          <p className="editorial-kicker text-xs font-semibold text-[var(--accent-warm)]">
            常见问题
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--accent-ink)] md:text-4xl">
            注册前你可能想知道
          </h2>
        </div>

        <div className="mx-auto mt-10 max-w-3xl space-y-3">
          {FAQS.map((faq) => (
            <details
              key={faq.q}
              className="editorial-card group rounded-[20px] p-5 [&_summary]:cursor-pointer"
            >
              <summary className="flex items-center justify-between text-sm font-semibold text-[var(--accent-ink)] marker:content-none">
                {faq.q}
                <span className="ml-4 shrink-0 text-[var(--accent-warm)] transition group-open:rotate-45">
                  ＋
                </span>
              </summary>
              <p className="editorial-copy mt-3 text-sm leading-relaxed text-stone-600">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* ── 底部 CTA + 页脚 ── */}
      <footer className="mt-16 text-center md:mt-24">
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--accent-ink)] md:text-3xl">
          开始你的第一篇稿件
        </h2>
        <p className="editorial-copy mx-auto mt-3 max-w-md text-sm text-stone-600">
          从想法到发布，七步走完。AI 替你干活，你拿主意。
        </p>
        <div className="mt-6">
          <PrimaryCTA />
        </div>
        <div className="mx-auto mt-16 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-[var(--accent-warm)]/10 pt-8 text-xs text-stone-400">
          <span>Writeflow</span>
          <span>主编陪跑型 AI 共创工作台</span>
          <Link href="/login" className="transition hover:text-[var(--accent-warm)]">
            登录
          </Link>
        </div>
      </footer>
    </main>
  );
}
