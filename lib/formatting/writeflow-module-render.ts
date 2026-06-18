import type { AdvancedModuleNode } from "@/lib/markdown/advanced-modules";
import { getFormatTokens } from "./format-tokens";

function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeImageUrl(value = "") {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed, "https://local.invalid");
    return ["http:", "https:"].includes(url.protocol) ? trimmed : "";
  } catch {
    return "";
  }
}

function root(name: string, content: string, style = "") {
  const T = getFormatTokens();
  return `<section data-writeflow-module="${escapeHtml(name)}" style="box-sizing:border-box;margin:22px 0;color:${T.colors.text};font-family:${T.font};line-height:1.6;${style}">${content}</section>`;
}

function label(value = "") {
  const T = getFormatTokens();
  if (!value) return "";
  return `<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:${T.colors.accent};font-weight:700;">${escapeHtml(value)}</p>`;
}

function renderWfLead(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  return root(
    node.name,
    `${label(node.fields.label)}${node.fields.title ? `<p style="margin:0 0 8px;font-size:17px;line-height:1.6;color:${T.colors.text};font-weight:700;">${escapeHtml(node.fields.title)}</p>` : ""}<p style="margin:0;font-size:16px;line-height:1.9;color:${T.colors.text};font-weight:600;">${escapeHtml(node.fields.body)}</p>`,
    `padding:2px 0 0;border-top:1px solid ${T.colors.border};`
  );
}

function renderWfSection(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  // 编号用描边环圆角块,提升视觉权重(DESIGN.md 第5节 wf-section 规格)。
  return root(
    node.name,
    `<section style="display:flex;align-items:center;gap:10px;margin:0 0 8px;"><span style="display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:24px;padding:0 8px;border-radius:${T.radius.small};box-shadow:0 0 0 1px ${T.colors.accent};color:${T.colors.accent};font-size:13px;line-height:1;font-weight:800;">${escapeHtml(node.fields.index)}</span><p style="margin:0;font-size:18px;line-height:1.3;color:${T.colors.text};font-weight:800;">${escapeHtml(node.fields.title)}</p></section>${node.fields.subtitle ? `<p style="margin:0 0 0 44px;font-size:14px;line-height:1.7;color:${T.colors.muted};">${escapeHtml(node.fields.subtitle)}</p>` : ""}`,
    "padding-top:8px;"
  );
}

function renderWfPullquote(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  // 浅底块包裹,让金句"沉下来"(DESIGN.md 第5节 wf-pullquote 规格)。
  // 注意:严禁 grid/linear-gradient(现有测试强制断言)。
  return root(
    node.name,
    `${label(node.fields.label)}<p style="margin:0;padding:0 0 0 14px;border-left:3px solid ${T.colors.accent};font-size:17px;line-height:1.85;font-weight:700;color:${T.colors.text};">${escapeHtml(node.fields.quote)}</p>${node.fields.source ? `<p style="margin:10px 0 0;padding-left:17px;font-size:13px;line-height:1.6;color:${T.colors.muted};">${escapeHtml(node.fields.source)}</p>` : ""}`,
    `padding:16px 18px;background:${T.colors.accentPale};border-radius:${T.radius.medium};`
  );
}

// 行型模块被误写成字段型时,渲染醒目的格式错误提示卡(不静默降级)。
// 帮助用户/AI 立刻发现"应该用 | 分隔",而非看到内容消失不知所措。
function renderRowFormatHint(moduleName: string) {
  const T = getFormatTokens();
  return root(
    moduleName,
    `<section style="padding:14px 16px;border-left:3px solid ${T.colors.warning};background:${T.colors.warningSoft};border-radius:${T.radius.small};"><p style="margin:0 0 6px;font-size:13px;font-weight:700;color:${T.colors.warning};">格式提示：${escapeHtml(moduleName)} 是行型模块</p><p style="margin:0;font-size:14px;line-height:1.7;color:${T.colors.text};">每行用竖线 <code style="background:${T.colors.accentPale};padding:1px 4px;border-radius:3px;">|</code> 分隔列，不要用 <code style="background:${T.colors.accentPale};padding:1px 4px;border-radius:3px;">key: value</code> 字段格式。示例：<code style="background:${T.colors.accentPale};padding:1px 4px;border-radius:3px;">第一列 | 第二列 | 第三列</code></p></section>`,
  );
}

function renderRows(node: AdvancedModuleNode, kind: "points" | "steps") {
  const T = getFormatTokens();

  // 容错:检测字段型误用。行型模块若被写成 key: value(如 side: xxx),
  // parser 会把每行当单个 cell(rows 每项只有 1 列且含冒号)。
  // 此时不静默降级,而是渲染明显的错误提示卡片,告诉用户/AI 正确格式。
  const looksLikeFieldType = node.rows.length > 0 &&
    node.rows.every((row) => row.length === 1 && /^[a-z-]+:\s/.test(row[0] ?? ""));
  if (looksLikeFieldType) {
    return renderRowFormatHint(node.name);
  }

  // wf-points / wf-steps: 描边环卡片,堆叠(严禁 display:grid,现有测试强制)。
  const rows = node.rows
    .map(([index = "", heading = "", body = ""]) =>
      `<section style="box-sizing:border-box;margin:0 0 12px;padding:14px 16px;border-radius:${T.radius.medium};box-shadow:0 0 0 1px ${T.colors.border};"><p style="margin:0 0 6px;font-size:13px;line-height:1.4;color:${T.colors.accent};font-weight:700;">${escapeHtml(index)}</p><p style="margin:0 0 6px;font-size:16px;line-height:1.55;color:${T.colors.text};font-weight:700;">${escapeHtml(heading)}</p><p style="margin:0;font-size:15px;line-height:1.8;color:${T.colors.text};">${escapeHtml(body)}</p></section>`
    )
    .join("");

  return root(`wf-${kind}`, rows);
}

// wf-compare: 字段型对照块。从 fieldEntries 收集 side/heading/body
// (每个 key 可重复多次),按下标配对成左右两列网格。
// 兼容 AI 的字段写法(side:/heading:/body:)和用户手写。
function renderWfCompare(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  const collect = (key: string) =>
    node.fieldEntries
      .filter((entry) => entry.key === key)
      .map((entry) => entry.value);

  const sides = collect("side");
  const headings = collect("heading");
  const bodies = collect("body");
  const pairCount = Math.max(sides.length, headings.length, bodies.length);

  // 如果字段型没收集到数据(比如用户用了 | 行型格式但被当 fields 解析),
  // 回退到从 node.rows 取(保留旧行为兼容)。
  const cells = pairCount === 0
    ? node.rows.map(([side = "", heading = "", body = ""]) => ({ side, heading, body }))
    : Array.from({ length: pairCount }, (_, i) => ({
        side: sides[i] ?? "",
        heading: headings[i] ?? "",
        body: bodies[i] ?? "",
      }));

  const cellHtml = cells
    .map(
      ({ side, heading, body }) =>
        `<section style="box-sizing:border-box;padding:14px;border-radius:${T.radius.medium};background:${T.colors.accentPale};"><p style="margin:0 0 8px;font-size:12px;line-height:1.4;color:${T.colors.muted};font-weight:700;letter-spacing:0.05em;">${escapeHtml(side)}</p><p style="margin:0 0 6px;font-size:15px;line-height:1.5;color:${T.colors.text};font-weight:700;">${escapeHtml(heading)}</p><p style="margin:0;font-size:14px;line-height:1.75;color:${T.colors.text};">${escapeHtml(body)}</p></section>`,
    )
    .join("");

  return root(
    "wf-compare",
    `<section style="box-sizing:border-box;display:grid;grid-template-columns:1fr 1fr;gap:12px;">${cellHtml}</section>`,
  );
}

function renderWfNote(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  return root(
    node.name,
    `<section style="box-sizing:border-box;padding:12px 14px;border-left:3px solid ${T.colors.accent};background:${T.colors.accentPale};">${label(node.fields.label || node.fields.title)}<p style="margin:0;font-size:15px;line-height:1.8;color:${T.colors.text};">${escapeHtml(node.fields.body)}</p></section>`
  );
}

function renderWfImageNote(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  const src = safeImageUrl(node.fields.image);
  return root(
    node.name,
    `${src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(node.fields.alt || node.fields.title || "")}" style="display:block;width:100%;height:auto;margin:0 0 10px;border-radius:${T.radius.medium};" />` : ""}${node.fields.title ? `<p style="margin:0 0 6px;font-size:15px;line-height:1.6;color:${T.colors.text};font-weight:700;">${escapeHtml(node.fields.title)}</p>` : ""}${node.fields.body ? `<p style="margin:0;font-size:14px;line-height:1.75;color:${T.colors.muted};">${escapeHtml(node.fields.body)}</p>` : ""}${node.fields.note ? `<p style="margin:8px 0 0;font-size:13px;line-height:1.65;color:${T.colors.muted};">${escapeHtml(node.fields.note)}</p>` : ""}`
  );
}

// ===== 批次1:高频模块渲染器(每个有独有视觉签名) =====

// wf-navlist: 数字编号 + 左侧竖线连接的目录(区别 points:更紧凑,竖线贯穿)
function renderWfToc(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  const rows = node.rows
    .map(
      ([index = "", title = "", anchor = ""]) =>
        `<section style="box-sizing:border-box;position:relative;margin:0;padding:6px 0 6px 24px;"><span style="position:absolute;left:0;top:8px;width:18px;font-size:13px;font-weight:700;color:${T.colors.accent};text-align:center;">${escapeHtml(index)}</span><p style="margin:0;font-size:15px;line-height:1.6;color:${T.colors.text};">${escapeHtml(title)}</p>${anchor ? `<p style="margin:2px 0 0;font-size:12px;color:${T.colors.muted};">${escapeHtml(anchor)}</p>` : ""}</section>`,
    )
    .join("");
  return root("wf-navlist", rows);
}

// wf-cite: 左粗色块 + 浅底(区别 pullquote:有完整背景块,承载更长文本)
function renderWfQuote(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  return root(
    "wf-cite",
    `${label(node.fields.label)}<p style="margin:0;font-size:16px;line-height:1.85;color:${T.colors.text};">${escapeHtml(node.fields.body)}</p>${node.fields.source ? `<p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:${T.colors.muted};">${escapeHtml(node.fields.source)}</p>` : ""}`,
    `padding:16px 18px;background:${T.colors.accentPale};border-left:4px solid ${T.colors.accent};border-radius:${T.radius.small};`,
  );
}

// wf-highlight: 全宽强调色条横幅(区别 pullquote/quote:顶部色条 + 居中,最醒目)
function renderWfHighlight(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  return root(
    "wf-highlight",
    `${label(node.fields.label)}<p style="margin:0;font-size:17px;line-height:1.7;color:${T.colors.text};font-weight:700;text-align:center;">${escapeHtml(node.fields.body)}</p>`,
    `padding:20px 18px;border-top:3px solid ${T.colors.accent};border-bottom:1px solid ${T.colors.border};background:${T.colors.accentPale};`,
  );
}

// wf-qa: 问号锚标 + 缩进答案(独有:Q 标记符号 + 问答堆叠)
function renderWfFaq(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  return root(
    "wf-qa",
    `${label(node.fields.label)}<p style="margin:0 0 10px;font-size:16px;line-height:1.6;color:${T.colors.text};font-weight:700;"><span style="display:inline-block;margin-right:6px;color:${T.colors.accent};font-weight:800;">Q</span>${escapeHtml(node.fields.question)}</p><p style="margin:0 0 0 22px;padding:12px 14px;font-size:15px;line-height:1.8;color:${T.colors.text};background:${T.colors.accentPale};border-radius:${T.radius.small};">${escapeHtml(node.fields.answer)}</p>`,
  );
}

// wf-metric: 超大数字 + 标签(独有:数字超大居中,标签在下)
function renderWfMetric(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  return root(
    "wf-metric",
    `<p style="margin:0;font-size:36px;line-height:1.1;color:${T.colors.accent};font-weight:800;text-align:center;">${escapeHtml(node.fields.value)}${node.fields.unit ? `<span style="font-size:16px;font-weight:600;">${escapeHtml(node.fields.unit)}</span>` : ""}</p>${node.fields.label ? `<p style="margin:8px 0 0;font-size:13px;line-height:1.6;color:${T.colors.muted};text-align:center;">${escapeHtml(node.fields.label)}</p>` : ""}`,
    `padding:18px;border-radius:${T.radius.medium};box-shadow:0 0 0 1px ${T.colors.border};background:${T.colors.surface};`,
  );
}

// wf-timeline: 时间点 + 左侧竖线(独有:时间轴结构,圆点锚)
function renderWfTimeline(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  const rows = node.rows
    .map(
      ([time = "", event = "", detail = ""]) =>
        `<section style="box-sizing:border-box;position:relative;margin:0 0 14px;padding:0 0 0 22px;"><span style="position:absolute;left:2px;top:6px;width:9px;height:9px;border-radius:999px;background:${T.colors.accent};box-shadow:0 0 0 3px ${T.colors.accentPale};"></span>${time ? `<p style="margin:0 0 3px;font-size:12px;font-weight:700;color:${T.colors.accent};">${escapeHtml(time)}</p>` : ""}<p style="margin:0 0 3px;font-size:15px;line-height:1.5;color:${T.colors.text};font-weight:700;">${escapeHtml(event)}</p>${detail ? `<p style="margin:0;font-size:14px;line-height:1.7;color:${T.colors.muted};">${escapeHtml(detail)}</p>` : ""}</section>`,
    )
    .join("");
  // 用 border-left 模拟竖线贯穿
  return root("wf-timeline", rows, `padding-left:4px;`);
}

// wf-callout: 顶部色条 + 浅底盒(区别 note:更显眼,顶部完整色条)
function renderWfCallout(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  return root(
    "wf-callout",
    `${node.fields.title ? `<p style="margin:0 0 8px;font-size:15px;line-height:1.5;color:${T.colors.text};font-weight:800;">${escapeHtml(node.fields.title)}</p>` : `${label(node.fields.label)}`}<p style="margin:0;font-size:15px;line-height:1.8;color:${T.colors.text};">${escapeHtml(node.fields.body)}</p>`,
    `padding:16px 18px;border-top:3px solid ${T.colors.accent};background:${T.colors.accentPale};border-radius:0 0 ${T.radius.medium} ${T.radius.medium};`,
  );
}

// wf-signoff: 居中 + 分隔线 + 签名(独有:文末结束语,顶部分隔线 + 居中)
function renderWfSignoff(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  return root(
    "wf-signoff",
    `<p style="margin:0;font-size:15px;line-height:1.8;color:${T.colors.muted};text-align:center;">${escapeHtml(node.fields.body)}</p>${node.fields.signature ? `<p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:${T.colors.accent};font-weight:700;text-align:center;">${escapeHtml(node.fields.signature)}</p>` : ""}`,
    `padding:18px 0 0;border-top:1px solid ${T.colors.border};text-align:center;`,
  );
}

// ===== 批次2:常用模块渲染器(应用 open-design elevation 四级纪律) =====

// wf-hook: 居中悬念 + 省略号(elevation: flat,独有:纯居中大字悬念)
function renderWfHook(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  return root(
    "wf-hook",
    `${label(node.fields.label)}<p style="margin:0;font-size:18px;line-height:1.7;color:${T.colors.text};font-weight:700;text-align:center;">${escapeHtml(node.fields.body)}<span style="color:${T.colors.muted};font-weight:400;"> ……</span></p>`,
    `padding:16px 0;text-align:center;`,
  );
}

// wf-chapter: 超大编号 + 粗线(elevation: flat,独有:超大编号字号 + 顶部粗线)
function renderWfPart(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  return root(
    "wf-chapter",
    `<p style="margin:0 0 4px;font-size:13px;line-height:1.4;color:${T.colors.accent};font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">${escapeHtml(node.fields.label)}</p><p style="margin:0;font-size:28px;line-height:1.2;color:${T.colors.text};font-weight:800;">${escapeHtml(node.fields.title)}</p>${node.fields.subtitle ? `<p style="margin:8px 0 0;font-size:14px;line-height:1.7;color:${T.colors.muted};">${escapeHtml(node.fields.subtitle)}</p>` : ""}`,
    `padding:20px 0 8px;border-top:2px solid ${T.colors.text};`,
  );
}

// wf-divider: 居中装饰符号(elevation: flat,独有:纯符号居中,无文字)
function renderWfDivider(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  const ornaments: Record<string, string> = { dot: "· · ·", line: "———", star: "✦ ✦ ✦" };
  const symbol = ornaments[node.fields.ornament] || ornaments.dot;
  return root("wf-divider", `<p style="margin:0;font-size:16px;color:${T.colors.muted};text-align:center;letter-spacing:0.3em;">${escapeHtml(symbol)}</p>`, `padding:16px 0;text-align:center;`);
}

// wf-aside: 左缩进 + 浅底(elevation: ring,独有:左缩进 + 无竖线,区别 note)
function renderWfAside(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  return root(
    "wf-aside",
    `${label(node.fields.label)}<p style="margin:0;font-size:14px;line-height:1.8;color:${T.colors.muted};">${escapeHtml(node.fields.body)}</p>`,
    `margin:0 0 0 20px;padding:12px 16px;background:${T.colors.accentPale};border-radius:${T.radius.small};`,
  );
}

// wf-proscons: 双列 + 顶标签(elevation: ring,独有:两列对照 + side 区分正反)
function renderWfProscons(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  const cells = node.rows
    .map(
      ([side = "", item = "", detail = ""]) =>
        `<section style="box-sizing:border-box;padding:14px;border-radius:${T.radius.medium};box-shadow:0 0 0 1px ${T.colors.border};"><p style="margin:0 0 6px;font-size:12px;font-weight:700;color:${side.includes("优") || side.includes("优") ? T.colors.accent : T.colors.muted};letter-spacing:0.05em;">${escapeHtml(side)}</p><p style="margin:0 0 4px;font-size:15px;line-height:1.5;color:${T.colors.text};font-weight:700;">${escapeHtml(item)}</p>${detail ? `<p style="margin:0;font-size:14px;line-height:1.7;color:${T.colors.muted};">${escapeHtml(detail)}</p>` : ""}</section>`,
    )
    .join("");
  return root("wf-proscons", `<section style="box-sizing:border-box;display:grid;grid-template-columns:1fr 1fr;gap:12px;">${cells}</section>`);
}

// wf-stats: 数据网格(open-design 式深度:圆角大间距,不用阴影;独有:数字放大)
function renderWfStats(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  const cells = node.rows
    .map(
      ([value = "", label = "", unit = ""]) =>
        `<section style="box-sizing:border-box;padding:16px 12px;background:${T.colors.accentPale};border-radius:${T.radius.medium};text-align:center;"><p style="margin:0;font-size:24px;line-height:1.1;color:${T.colors.accent};font-weight:800;">${escapeHtml(value)}${unit ? `<span style="font-size:13px;font-weight:600;">${escapeHtml(unit)}</span>` : ""}</p>${label ? `<p style="margin:6px 0 0;font-size:12px;line-height:1.5;color:${T.colors.muted};">${escapeHtml(label)}</p>` : ""}</section>`,
    )
    .join("");
  return root("wf-stats", `<section style="box-sizing:border-box;display:grid;grid-template-columns:1fr 1fr;gap:12px;">${cells}</section>`);
}

// wf-case: 标题 + 正文 + 结果高亮(elevation: ring-accent,独有:结果块用 accent 描边环)
function renderWfCase(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  return root(
    "wf-case",
    `<p style="margin:0 0 8px;font-size:16px;line-height:1.5;color:${T.colors.text};font-weight:700;">${escapeHtml(node.fields.title)}</p><p style="margin:0 0 12px;font-size:15px;line-height:1.8;color:${T.colors.text};">${escapeHtml(node.fields.body)}</p>${node.fields.result ? `<section style="padding:12px 14px;border-radius:${T.radius.small};box-shadow:0 0 0 1px ${T.colors.accent};"><p style="margin:0;font-size:14px;line-height:1.7;color:${T.colors.text};"><span style="color:${T.colors.accent};font-weight:700;">结果：</span>${escapeHtml(node.fields.result)}</p></section>` : ""}`,
    `padding:16px;border-radius:${T.radius.medium};box-shadow:0 0 0 1px ${T.colors.border};`,
  );
}

// wf-author: 居中作者卡(elevation: ring-accent,独有:头像位 + 居中三行)
function renderWfAuthor(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  return root(
    "wf-author",
    `<section style="margin:0 auto 10px;width:48px;height:48px;border-radius:999px;box-shadow:0 0 0 2px ${T.colors.accent};background:${T.colors.accentSoft};display:flex;align-items:center;justify-content:center;color:${T.colors.accent};font-size:18px;font-weight:800;">${escapeHtml(node.fields.name.charAt(0))}</section><p style="margin:0 0 2px;font-size:16px;line-height:1.4;color:${T.colors.text};font-weight:800;text-align:center;">${escapeHtml(node.fields.name)}</p>${node.fields.role ? `<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:${T.colors.accent};font-weight:600;text-align:center;">${escapeHtml(node.fields.role)}</p>` : ""}${node.fields.bio ? `<p style="margin:0;font-size:14px;line-height:1.7;color:${T.colors.muted};text-align:center;">${escapeHtml(node.fields.bio)}</p>` : ""}`,
    `padding:20px;border-radius:${T.radius.medium};box-shadow:0 0 0 1px ${T.colors.border};text-align:center;`,
  );
}

// ===== 批次3:补充模块渲染器(凑够 33) =====

// wf-tasks: 勾选符号 + 列表(elevation: flat,独有:✓/✗ 符号锚 + 缩进)
function renderWfChecklist(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  const rows = node.rows
    .map(([item = "", checked = "", note = ""]) => {
      const isChecked = checked.includes("✓") || checked.includes("是") || checked.toLowerCase().includes("y");
      const mark = isChecked ? "✓" : "✗";
      const markColor = isChecked ? T.colors.accent : T.colors.muted;
      return `<section style="box-sizing:border-box;margin:0 0 10px;padding:6px 0;border-bottom:1px solid ${T.colors.border};"><p style="margin:0;font-size:15px;line-height:1.6;color:${T.colors.text};"><span style="display:inline-block;width:20px;color:${markColor};font-weight:800;">${mark}</span>${escapeHtml(item)}</p>${note ? `<p style="margin:3px 0 0 20px;font-size:13px;line-height:1.6;color:${T.colors.muted};">${escapeHtml(note)}</p>` : ""}</section>`;
    })
    .join("");
  return root("wf-tasks", rows);
}

// wf-question: 居中问号锚(elevation: flat,独有:居中 ? 符号 + 反问)
function renderWfQuestion(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  return root(
    "wf-question",
    `<p style="margin:0 0 8px;font-size:28px;line-height:1;color:${T.colors.accent};font-weight:800;text-align:center;">?</p><p style="margin:0;font-size:17px;line-height:1.7;color:${T.colors.text};font-weight:700;text-align:center;">${escapeHtml(node.fields.body)}</p>${node.fields.hint ? `<p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:${T.colors.muted};text-align:center;">${escapeHtml(node.fields.hint)}</p>` : ""}`,
    `padding:18px 0;text-align:center;`,
  );
}

// wf-prompt: 柔和提示框(elevation: ring,独有:虚线边框,区别 note/callout 的实色)
function renderWfPrompt(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  return root(
    "wf-prompt",
    `${label(node.fields.label)}<p style="margin:0;font-size:15px;line-height:1.8;color:${T.colors.text};">${escapeHtml(node.fields.body)}</p>`,
    `padding:14px 16px;border:1px dashed ${T.colors.border};border-radius:${T.radius.medium};background:${T.colors.accentPale};`,
  );
}

// wf-quote-evidence: 引号 + 出处 + 角色(elevation: flat,独有:大引号装饰 + 角色标签)
function renderWfQuoteEvidence(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  return root(
    "wf-quote-evidence",
    `<p style="margin:0 0 4px;font-size:28px;line-height:1;color:${T.colors.accent};font-weight:800;">"</p><p style="margin:0 0 10px;font-size:15px;line-height:1.8;color:${T.colors.text};">${escapeHtml(node.fields.body)}</p>${node.fields.source || node.fields.role ? `<p style="margin:0;font-size:13px;line-height:1.6;color:${T.colors.muted};">${node.fields.role ? `<span style="color:${T.colors.accent};font-weight:600;">${escapeHtml(node.fields.role)}</span>${node.fields.source ? " · " : ""}` : ""}${node.fields.source ? escapeHtml(node.fields.source) : ""}</p>` : ""}`,
  );
}

// wf-source: 来源标注卡(elevation: ring,独有:左竖线 + 链接样式)
function renderWfSource(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  return root(
    "wf-source",
    `<p style="margin:0 0 4px;font-size:14px;line-height:1.5;color:${T.colors.text};font-weight:700;">${escapeHtml(node.fields.title)}</p>${node.fields.publisher ? `<p style="margin:0 0 4px;font-size:13px;line-height:1.5;color:${T.colors.muted};">${escapeHtml(node.fields.publisher)}</p>` : ""}${node.fields.url ? `<p style="margin:0;font-size:12px;line-height:1.5;color:${T.colors.accent};word-break:break-all;">${escapeHtml(node.fields.url)}</p>` : ""}`,
    `padding:12px 14px;border-left:3px solid ${T.colors.border};background:${T.colors.accentPale};border-radius:${T.radius.small};`,
  );
}

// wf-profiles: 多人物行(elevation: flat,独有:首字母圆 + 行式堆叠)
function renderWfPeople(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  const rows = node.rows
    .map(([name = "", role = "", note = ""]) =>
      `<section style="box-sizing:border-box;margin:0 0 12px;display:flex;align-items:flex-start;gap:10px;"><span style="flex-shrink:0;width:32px;height:32px;border-radius:999px;background:${T.colors.accentSoft};color:${T.colors.accent};font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center;">${escapeHtml(name.charAt(0))}</span><section style="flex:1;"><p style="margin:0 0 2px;font-size:15px;line-height:1.4;color:${T.colors.text};font-weight:700;">${escapeHtml(name)}${role ? `<span style="font-size:12px;color:${T.colors.muted};font-weight:400;margin-left:6px;">${escapeHtml(role)}</span>` : ""}</p>${note ? `<p style="margin:0;font-size:13px;line-height:1.6;color:${T.colors.muted};">${escapeHtml(note)}</p>` : ""}</section></section>`,
    )
    .join("");
  return root("wf-profiles", rows);
}

// wf-imagewall: 多图并排(elevation: flat,独有:两列图网格)
function renderWfGallery(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  const cells = node.rows
    .map(([src = "", caption = ""]) =>
      `<section style="box-sizing:border-box;"><img src="${escapeHtml(src)}" alt="${escapeHtml(caption)}" style="display:block;width:100%;height:auto;border-radius:${T.radius.medium};" />${caption ? `<p style="margin:6px 0 0;font-size:12px;line-height:1.5;color:${T.colors.muted};text-align:center;">${escapeHtml(caption)}</p>` : ""}</section>`,
    )
    .join("");
  return root("wf-imagewall", `<section style="box-sizing:border-box;display:grid;grid-template-columns:1fr 1fr;gap:10px;">${cells}</section>`);
}

// wf-stats-grid: 四宫格数据(比 wf-stats 更紧凑,elevation: ring + 间距)
function renderWfStatsGrid(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  const cells = node.rows
    .map(([value = "", label = "", unit = ""]) =>
      `<section style="box-sizing:border-box;padding:12px 8px;border-radius:${T.radius.small};box-shadow:0 0 0 1px ${T.colors.border};text-align:center;"><p style="margin:0;font-size:20px;line-height:1.1;color:${T.colors.accent};font-weight:800;">${escapeHtml(value)}${unit ? `<span style="font-size:11px;font-weight:600;">${escapeHtml(unit)}</span>` : ""}</p>${label ? `<p style="margin:4px 0 0;font-size:11px;line-height:1.4;color:${T.colors.muted};">${escapeHtml(label)}</p>` : ""}</section>`,
    )
    .join("");
  return root("wf-stats-grid", `<section style="box-sizing:border-box;display:grid;grid-template-columns:1fr 1fr;gap:8px;">${cells}</section>`);
}

// wf-recap: 回顾小结盒(elevation: ring,独有:编号回顾 + 浅底)
function renderWfRecap(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  return root(
    "wf-recap",
    `${node.fields.count ? `<p style="margin:0 0 6px;font-size:12px;font-weight:700;color:${T.colors.accent};letter-spacing:0.05em;">回顾 · ${escapeHtml(node.fields.count)}</p>` : label(node.fields.label)}<p style="margin:0;font-size:15px;line-height:1.8;color:${T.colors.text};">${escapeHtml(node.fields.body)}</p>`,
    `padding:14px 16px;background:${T.colors.accentPale};border-radius:${T.radius.medium};box-shadow:0 0 0 1px ${T.colors.border};`,
  );
}

export function renderWriteflowModule(node: AdvancedModuleNode) {
  switch (node.name) {
    case "wf-lead":
      return renderWfLead(node);
    case "wf-section":
      return renderWfSection(node);
    case "wf-pullquote":
      return renderWfPullquote(node);
    case "wf-points":
      return renderRows(node, "points");
    case "wf-steps":
      return renderRows(node, "steps");
    case "wf-note":
      return renderWfNote(node);
    case "wf-compare":
      return renderWfCompare(node);
    case "wf-image-note":
      return renderWfImageNote(node);
    case "wf-navlist":
      return renderWfToc(node);
    case "wf-cite":
      return renderWfQuote(node);
    case "wf-highlight":
      return renderWfHighlight(node);
    case "wf-qa":
      return renderWfFaq(node);
    case "wf-metric":
      return renderWfMetric(node);
    case "wf-timeline":
      return renderWfTimeline(node);
    case "wf-callout":
      return renderWfCallout(node);
    case "wf-signoff":
      return renderWfSignoff(node);
    case "wf-hook":
      return renderWfHook(node);
    case "wf-chapter":
      return renderWfPart(node);
    case "wf-divider":
      return renderWfDivider(node);
    case "wf-aside":
      return renderWfAside(node);
    case "wf-proscons":
      return renderWfProscons(node);
    case "wf-stats":
      return renderWfStats(node);
    case "wf-case":
      return renderWfCase(node);
    case "wf-author":
      return renderWfAuthor(node);
    case "wf-tasks":
      return renderWfChecklist(node);
    case "wf-question":
      return renderWfQuestion(node);
    case "wf-prompt":
      return renderWfPrompt(node);
    case "wf-quote-evidence":
      return renderWfQuoteEvidence(node);
    case "wf-source":
      return renderWfSource(node);
    case "wf-profiles":
      return renderWfPeople(node);
    case "wf-imagewall":
      return renderWfGallery(node);
    case "wf-stats-grid":
      return renderWfStatsGrid(node);
    case "wf-recap":
      return renderWfRecap(node);
    default:
      return "";
  }
}
