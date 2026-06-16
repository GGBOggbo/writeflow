import type { AdvancedModuleNode } from "@/lib/markdown/advanced-modules";
import { getFormatTokens, type FormatTokens } from "./format-tokens";

let T: FormatTokens = getFormatTokens();

function baseCardStyle() {
  return [
    `font-family:${T.font}`,
    `color:${T.colors.text}`,
    `background:${T.colors.surface}`,
    `border:${T.border}`,
    `border-radius:${T.radius.large}`,
    `box-shadow:${T.shadow}`,
    "box-sizing:border-box",
    "margin:24px 0",
    "padding:24px",
    "line-height:1.75",
    "overflow:hidden",
  ].join(";");
}

function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeUrl(value = "", image = false) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const normalized = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : /^[/#.]/.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
  try {
    const url = new URL(normalized, "https://local.invalid");
    const allowed = image
      ? ["http:", "https:"]
      : ["http:", "https:", "mailto:"];
    return allowed.includes(url.protocol) ? normalized : "";
  } catch {
    return "";
  }
}

function splitList(value = "") {
  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function eyebrow(value = "") {
  if (!value) return "";
  return `<p style="margin:0 0 8px;color:${T.colors.accent};font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(value)}</p>`;
}

function title(value = "", size = 25) {
  if (!value) return "";
  const parts = value.split("|").map((part) => part.trim());
  const content = parts
    .map((part, index) =>
      index % 2 === 1
        ? `<span style="color:${T.colors.accent};">${escapeHtml(part)}</span>`
        : escapeHtml(part)
    )
    .join("");
  return `<h3 style="margin:0;color:${T.colors.text};font-size:${size}px;line-height:1.35;font-weight:800;letter-spacing:-0.02em;">${content}</h3>`;
}

function text(value = "", style = "") {
  if (!value) return "";
  return `<p style="margin:10px 0 0;color:${T.colors.muted};font-size:15px;line-height:1.8;${style}">${escapeHtml(value)}</p>`;
}

function note(value = "") {
  if (!value) return "";
  return `<p style="margin:14px 0 0;padding-top:12px;border-top:1px solid ${T.colors.border};color:${T.colors.muted};font-size:12px;line-height:1.65;">${escapeHtml(value)}</p>`;
}

function pill(value: string, tone: "accent" | "muted" = "accent") {
  const accent = tone === "accent";
  return `<span style="display:inline-block;margin:4px 6px 0 0;padding:4px 10px;border-radius:${T.radius.pill};background:${accent ? T.colors.accentSoft : T.colors.accentPale};color:${accent ? T.colors.accent : T.colors.muted};font-size:12px;font-weight:700;line-height:1.5;">${escapeHtml(value)}</span>`;
}

function pills(value = "", tone: "accent" | "muted" = "accent") {
  const items = splitList(value);
  return items.length
    ? `<div style="margin-top:12px;">${items.map((item) => pill(item, tone)).join("")}</div>`
    : "";
}

function image(value = "", alt = "", style = "") {
  const src = safeUrl(value, true);
  if (!src) return "";
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" style="display:block;width:100%;height:auto;border-radius:${T.radius.medium};${style}" />`;
}

function link(value = "", label = "查看详情") {
  const href = safeUrl(value);
  if (!href) return escapeHtml(label);
  return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="color:${T.colors.accent};font-weight:700;text-decoration:none;">${escapeHtml(label)}</a>`;
}

function shell(node: AdvancedModuleNode, content: string, style = "") {
  return `<section data-mpa-action-id="${node.name}" style="${baseCardStyle()};${style}">${content}</section>`;
}

function moduleRoot(node: AdvancedModuleNode, content: string, style = "") {
  return `<section data-mpa-action-id="${node.name}" style="font-family:${T.font};color:${T.colors.text};box-sizing:border-box;line-height:1.75;${style}">${content}</section>`;
}

function sectionLabel(value = "") {
  if (!value) return "";
  return `<p style="font-size:13px;color:${T.colors.muted};margin:0 0 12px;text-transform:uppercase;letter-spacing:1.8px;font-weight:700;">${escapeHtml(value)}</p>`;
}

function responsiveGrid(content: string, minWidth: number, gap = 12) {
  return `<section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(${minWidth}px,1fr));gap:${gap}px;">${content}</section>`;
}

function rowCard(content: string, accent = false) {
  return `<section style="margin-top:12px;padding:16px;border-radius:${T.radius.medium};border:1px solid ${accent ? T.colors.accent : T.colors.border};background:${accent ? T.colors.accentSoft : T.colors.accentPale};">${content}</section>`;
}

function isAccent(value = "") {
  return value.trim().toLowerCase() === "accent";
}

function renderHero(node: AdvancedModuleNode) {
  const f = node.fields;
  return moduleRoot(
    node,
    `<section style="padding:24px 22px 18px;background:linear-gradient(180deg,${T.colors.accentSoft} 0%,${T.colors.surface} 46%,${T.colors.surface} 100%);"><section style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap;">${f.eyebrow ? pill(f.eyebrow) : ""}${f.meta ? `<span style="color:${T.colors.muted};font-size:12px;font-weight:700;">${escapeHtml(f.meta)}</span>` : ""}</section>${f.kicker ? `<p style="margin:0 0 8px;color:${T.colors.accent};font-size:13px;font-weight:800;">${escapeHtml(f.kicker)}</p>` : ""}${title(f.title, 28)}${text(f.subtitle, `color:${T.colors.text};font-size:15px;`)}</section>${f.image ? `<section style="background:${T.colors.surface};">${image(f.image, f.title || "封面图片", "border-radius:0;")}</section>` : ""}<section style="background:linear-gradient(180deg,${T.colors.surface} 0%,${T.colors.accentPale} 100%);padding:12px 22px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;border-top:1px solid rgba(202,202,199,0.18);"><strong style="font-size:13px;color:${T.colors.text};">${escapeHtml(f.brand)}</strong>${pills(f.tags)}</section>`,
    `margin:0 0 34px;background:${T.colors.surface};border:${T.border};border-radius:16px;overflow:hidden;box-shadow:${T.shadow};width:100%;`
  );
}

function renderCards(node: AdvancedModuleNode) {
  const cards = node.rows
    .map(
      ([index = "", heading = "", body = "", tone = ""]) =>
        `<section style="padding:16px;border-radius:14px;border:1px solid ${isAccent(tone) ? T.colors.border : "rgba(202,202,199,0.18)"};background:${isAccent(tone) ? `linear-gradient(180deg,${T.colors.accentSoft} 0%,${T.colors.accentPale} 100%)` : T.colors.surface};box-shadow:${T.shadow};"><p style="margin:0;color:${T.colors.accent};font-size:12px;font-weight:900;letter-spacing:0.08em;">${escapeHtml(index)}</p><p style="margin:8px 0 0;color:${T.colors.text};font-size:17px;font-weight:900;">${escapeHtml(heading)}</p>${text(body)}</section>`
    )
    .join("");
  return moduleRoot(
    node,
    `<section style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:12px;">${sectionLabel(node.title)}</section>${responsiveGrid(cards, 160)}`,
    "margin:0 0 32px;"
  );
}

function renderMetrics(node: AdvancedModuleNode) {
  const cards = node.rows
    .map(
      ([label = "", value = "", description = "", tone = ""]) =>
        `<section style="padding:16px;border-radius:14px;background:${isAccent(tone) ? T.colors.accentSoft : T.colors.surface};border:1px solid ${isAccent(tone) ? T.colors.border : "rgba(202,202,199,0.18)"};box-shadow:${T.shadow};"><p style="margin:0;color:${T.colors.muted};font-size:13px;font-weight:700;">${escapeHtml(label)}</p><p style="margin:5px 0 0;color:${T.colors.accent};font-size:28px;font-weight:900;line-height:1.2;">${escapeHtml(value)}</p>${text(description)}</section>`
    )
    .join("");
  return moduleRoot(
    node,
    `<section style="margin-bottom:12px;">${sectionLabel(node.title)}</section>${responsiveGrid(cards, 160)}`,
    "margin:0 0 28px;"
  );
}

function renderInfographic(node: AdvancedModuleNode) {
  const f = node.fields;
  const statement = (f.title || "")
    .split("|")
    .map((part, index) =>
      index % 2 === 1
        ? `<span style="display:inline-block;padding:0 5px 2px;margin:0 2px 2px 0;border-bottom:1px solid ${T.colors.border};box-shadow:inset 0 -0.55em 0 ${T.colors.accentSoft};">${escapeHtml(part)}</span>`
        : escapeHtml(part)
    )
    .join("");
  return moduleRoot(
    node,
    `<section style="position:relative;overflow:hidden;border-radius:22px;background:linear-gradient(135deg,${T.colors.surface} 0%,${T.colors.accentPale} 100%);border:${T.border};box-shadow:${T.shadow};color:${T.colors.text};"><section data-infographic-type="${escapeHtml(f.type || "statement")}" style="padding:24px 22px 20px;display:flex;flex-direction:column;justify-content:space-between;min-height:238px;"><section><section style="display:flex;align-items:center;gap:8px;margin-bottom:20px;"><span style="display:inline-flex;width:30px;height:30px;border-radius:999px;border:${T.border};background:${T.colors.surface};align-items:center;justify-content:center;"><span style="display:inline-block;width:10px;height:2px;border-radius:999px;background:${T.colors.accent};"></span></span>${f.eyebrow ? pill(f.eyebrow) : ""}</section><span style="display:inline-block;width:54px;height:2px;border-radius:999px;background:${T.colors.accent};margin-bottom:16px;"></span><p style="margin:0;font-size:22px;font-weight:900;line-height:1.22;letter-spacing:-0.035em;color:${T.colors.text};">${statement}</p>${text(f.subtitle, `color:${T.colors.text};line-height:1.72;`)}${f.quote ? `<p style="margin:18px 0 0;padding:12px 0 0 14px;border-left:2px solid ${T.colors.border};font-size:22px;font-weight:800;color:${T.colors.text};line-height:1.62;">${escapeHtml(f.quote)}</p>` : ""}</section>${f.note ? `<section style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-top:22px;"><p style="margin:0;font-size:13px;color:${T.colors.muted};line-height:1.55;">${escapeHtml(f.note)}</p><span style="display:inline-block;width:58px;height:16px;border-right:1px solid ${T.colors.border};border-bottom:1px solid ${T.colors.border};"></span></section>` : ""}</section></section>`,
    "margin:0 0 32px;"
  );
}

function renderAudienceFit(node: AdvancedModuleNode) {
  const f = node.fields;
  const group = (label: string, value: string, positive: boolean) =>
    value
      ? `<section style="margin-top:14px;padding:16px;border-radius:${T.radius.medium};background:${positive ? T.colors.accentSoft : T.colors.dangerSoft};"><p style="margin:0 0 8px;color:${positive ? T.colors.accent : T.colors.danger};font-size:13px;font-weight:800;">${label}</p>${splitList(value).map((item) => `<p style="margin:5px 0;color:${T.colors.text};font-size:14px;">${positive ? "✓" : "×"} ${escapeHtml(item)}</p>`).join("")}</section>`
      : "";
  return moduleRoot(
    node,
    `<section style="margin:0 0 14px;">${title(f.title || node.title || "适用人群", 21)}</section>${responsiveGrid(`${group("适合", f.fit, true)}${group("不太适合", f.avoid, false)}`, 260)}`,
    `margin:0 0 30px;padding:18px;background:linear-gradient(180deg,${T.colors.surface} 0%,${T.colors.accentPale} 100%);border:${T.border};border-radius:16px;box-shadow:${T.shadow};`
  );
}

function renderVerdict(node: AdvancedModuleNode) {
  const f = node.fields;
  const label = f.eyebrow || "最终判断";
  return shell(
    node,
    `<section style="display:flex;align-items:center;gap:8px;margin:0 0 10px;"><span style="display:inline-block;width:11px;height:11px;border-radius:4px;background:${T.colors.accent};box-shadow:0 0 0 4px ${T.colors.accentSoft};flex-shrink:0;"></span><p style="margin:0;font-size:13px;font-weight:900;color:${T.colors.accent};letter-spacing:1px;line-height:1.45;">${escapeHtml(label)}</p></section><p style="margin:0;font-size:17px;font-weight:900;color:${T.colors.text};line-height:1.45;letter-spacing:-0.02em;">${escapeHtml(f.title)}</p><p style="margin:9px 0 0;font-size:15px;color:${T.colors.text};line-height:1.75;">${escapeHtml(f.body)}</p>`,
    `margin:0 0 30px;padding:18px 18px 16px;background:linear-gradient(135deg,${T.colors.accentSoft} 0%,${T.colors.surface} 48%,${T.colors.accentPale} 100%);border:1px solid ${T.colors.border};border-radius:16px;`
  );
}

function renderPeople(node: AdvancedModuleNode) {
  const cards = node.rows.map(([name = "", role = "", body = "", tone = ""]) => `<section style="padding:16px;border-radius:14px;background:${isAccent(tone) ? T.colors.accentSoft : T.colors.surface};border:${T.border};box-shadow:${T.shadow};"><div style="display:inline-block;width:36px;height:36px;border-radius:50%;background:${T.colors.accent};color:#fff;text-align:center;line-height:36px;font-weight:800;">${escapeHtml(name.slice(0, 1))}</div><p style="margin:10px 0 0;color:${T.colors.text};font-size:17px;font-weight:800;">${escapeHtml(name)}</p><p style="margin:2px 0;color:${T.colors.accent};font-size:12px;font-weight:700;">${escapeHtml(role)}</p>${text(body)}</section>`).join("");
  return moduleRoot(
    node,
    `${sectionLabel(node.title)}${responsiveGrid(cards, 180)}`,
    "margin:0 0 30px;"
  );
}

function renderCases(node: AdvancedModuleNode) {
  const cards = node.rows.map(([name = "", result = "", body = "", tone = ""]) => `<section style="padding:16px;border-radius:14px;background:${isAccent(tone) ? T.colors.accentSoft : T.colors.surface};border:${T.border};box-shadow:${T.shadow};"><p style="margin:0;color:${T.colors.accent};font-size:19px;font-weight:900;">${escapeHtml(result)}</p><p style="margin:8px 0 0;color:${T.colors.text};font-size:17px;font-weight:900;">${escapeHtml(name)}</p>${text(body)}</section>`).join("");
  return moduleRoot(node, `${sectionLabel(node.title)}${responsiveGrid(cards, 220)}`, "margin:0 0 30px;");
}

function renderPricing(node: AdvancedModuleNode) {
  const cards = node.rows.map(([name = "", price = "", features = "", tone = ""]) => `<section style="padding:17px;border-radius:14px;background:${isAccent(tone) ? T.colors.accentSoft : T.colors.surface};border:${T.border};box-shadow:${T.shadow};"><p style="margin:0;color:${T.colors.text};font-size:17px;font-weight:900;">${escapeHtml(name)}</p><p style="margin:8px 0;color:${T.colors.accent};font-size:28px;font-weight:900;">${escapeHtml(price)}</p>${splitList(features.replaceAll("/", "|")).map((item) => `<p style="margin:5px 0;color:${T.colors.muted};font-size:14px;">${escapeHtml(item)}</p>`).join("")}</section>`).join("");
  return moduleRoot(node, `${sectionLabel(node.title)}${responsiveGrid(cards, 200)}`, "margin:0 0 30px;");
}

function renderFaq(node: AdvancedModuleNode) {
  return moduleRoot(node, `${sectionLabel(node.title)}${node.rows.map(([question = "", answer = ""]) => `<section style="margin:0 0 12px;border-radius:12px;overflow:hidden;border:${T.border};"><section style="padding:13px 15px;background:${T.colors.surface};"><span style="color:${T.colors.accent};font-weight:900;">Q</span><p data-mpa-action-id="faq_question" style="display:inline;margin:0 0 0 8px;color:${T.colors.text};font-size:15px;font-weight:800;">${escapeHtml(question)}</p></section><section style="padding:13px 15px;background:${T.colors.accentPale};"><span style="color:${T.colors.muted};font-weight:900;">A</span><p data-mpa-action-id="faq_answer" style="display:inline;margin:0 0 0 8px;color:${T.colors.muted};font-size:14px;line-height:1.75;">${escapeHtml(answer)}</p></section></section>`).join("")}`, "margin:0 0 30px;");
}

function renderLogos(node: AdvancedModuleNode) {
  const cards = node.rows.map(([name = "", desc = ""]) => `<section style="padding:14px;text-align:center;border:${T.border};border-radius:12px;background:${T.colors.surface};box-shadow:${T.shadow};"><strong style="display:block;color:${T.colors.text};font-size:15px;">${escapeHtml(name)}</strong><small style="color:${T.colors.muted};">${escapeHtml(desc)}</small></section>`).join("");
  return moduleRoot(node, `${sectionLabel(node.title)}<section style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">${cards}</section>`, "margin:0 0 30px;");
}

function renderPart(node: AdvancedModuleNode) {
  const f = node.fields;
  return moduleRoot(node, `<section style="display:flex;align-items:center;justify-content:center;text-align:center;flex-shrink:0;width:56px;height:56px;background:linear-gradient(180deg,${T.colors.accentSoft} 0%,${T.colors.accentPale} 100%);border:1px solid ${T.colors.border};border-radius:999px;box-shadow:${T.shadow};"><strong style="color:${T.colors.accent};font-size:18px;">${escapeHtml(f.index)}</strong></section><span style="width:2px;align-self:stretch;border-radius:999px;background:linear-gradient(${T.colors.border},transparent);flex-shrink:0;"></span><section style="display:flex;flex-direction:column;justify-content:center;flex:1 1 0%;min-width:0;">${title(f.title, 21)}${text(f.subtitle, "font-size:12px;letter-spacing:0.08em;")}</section>`, `display:flex;align-items:center;gap:12px;margin:36px 0 20px;padding:14px 16px;background:${T.colors.surface};border:${T.border};border-radius:12px;box-shadow:${T.shadow};`);
}

function renderLabelTitle(node: AdvancedModuleNode) {
  const f = node.fields;
  return moduleRoot(node, `${pill(f.label || "重点")}<h4 style="font-size:17px;font-weight:900;color:${T.colors.text};margin:0;">${escapeHtml(f.title)}</h4>`, "display:flex;align-items:center;gap:8px;margin:34px 0 14px;flex-wrap:wrap;");
}

function renderQuote(node: AdvancedModuleNode) {
  const f = node.fields;
  return moduleRoot(node, `<section style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">${f.eyebrow ? pill(f.eyebrow) : ""}</section><p style="font-size:22px;font-weight:850;color:${T.colors.text};margin:0;line-height:1.7;letter-spacing:0.1px;">${escapeHtml(f.quote)}</p>${f.source || f.note ? `<section style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:12px;padding-top:10px;border-top:1px solid rgba(202,202,199,0.18);"><span style="color:${T.colors.muted};font-size:13px;">${f.source ? `—— ${escapeHtml(f.source)}` : ""}</span><span style="color:${T.colors.muted};font-size:12px;">${escapeHtml(f.note)}</span></section>` : ""}`, `margin:0 0 28px;padding:16px 16px 14px;background:${T.colors.surface};border:${T.border};border-radius:12px;box-shadow:${T.shadow};`);
}

function renderImageText(node: AdvancedModuleNode) {
  const f = node.fields;
  const imageFirst = f.layout !== "text-left";
  const visual = `<section style="flex:1 1 260px;min-width:0;">${image(f.image, f.alt || f.title)}</section>`;
  const copy = `<section style="flex:1 1 260px;min-width:0;">${eyebrow(f.eyebrow)}${title(f.title, 21)}${text(f.body)}${note(f.note)}</section>`;
  return moduleRoot(node, `<section style="display:flex;flex-wrap:wrap;gap:16px;">${imageFirst ? `${visual}${copy}` : `${copy}${visual}`}</section>`, "margin:0 0 32px;");
}

function renderImageCompare(node: AdvancedModuleNode) {
  const f = node.fields;
  const item = (label: string, src: string) => `<section style="padding:12px;border:${T.border};border-radius:12px;background:${T.colors.surface};box-shadow:${T.shadow};">${title(label, 16)}<div style="margin-top:8px;">${image(src, label)}</div></section>`;
  return moduleRoot(node, `<section style="margin:0 0 14px;">${eyebrow(f.eyebrow)}${title(f.title, 21)}</section>${responsiveGrid(`${item(f.left_title, f.left_image)}${item(f.right_title, f.right_image)}`, 280)}${text(f.note)}`, "margin:0 0 28px;");
}

function renderImageAnnotate(node: AdvancedModuleNode) {
  const f = node.fields;
  const points = node.fieldEntries.filter(({ key }) => key === "point").map(({ value }) => splitList(value));
  return moduleRoot(node, `<section style="margin:0 0 14px;">${eyebrow(f.eyebrow)}${title(f.title, 21)}</section><section style="border-radius:12px;overflow:hidden;background:${T.colors.surface};position:relative;min-height:200px;border:${T.border};box-shadow:${T.shadow};aspect-ratio:4/3;">${image(f.image, f.alt || f.title, "height:100%;object-fit:cover;border-radius:0;")}</section><section style="display:flex;flex-direction:column;gap:12px;margin-top:14px;">${points.map(([index = "", , , heading = "", body = ""]) => rowCard(`<p style="margin:0;color:${T.colors.accent};font-size:12px;font-weight:900;">${escapeHtml(index)}</p>${title(heading, 16)}${text(body)}`)).join("")}</section>${text(f.note)}`, "margin:0 0 28px;");
}

function renderToc(node: AdvancedModuleNode) {
  return moduleRoot(node, `${node.title ? pill(node.title) : ""}<section style="display:flex;flex-direction:column;gap:12px;margin-top:12px;">${node.rows.map(([index = "", heading = "", body = ""]) => `<section style="display:flex;gap:12px;padding:12px;border-radius:10px;background:${T.colors.surface};border:${T.border};"><strong style="color:${T.colors.accent};">${escapeHtml(index)}</strong><span><strong style="display:block;color:${T.colors.text};">${escapeHtml(heading)}</strong><small style="color:${T.colors.muted};">${escapeHtml(body)}</small></span></section>`).join("")}</section>`, `margin:0 0 30px;padding:18px;background:linear-gradient(135deg,${T.colors.surface} 0%,${T.colors.accentPale} 100%);border:${T.border};border-radius:12px;box-shadow:${T.shadow};`);
}

function renderChecklist(node: AdvancedModuleNode) {
  const symbols: Record<string, string> = { done: "✓", pending: "○", warn: "!" };
  const rows = node.rows.map(([state = "", heading = "", body = ""]) => {
    const done = state === "done";
    const warn = state === "warn";
    return `<section style="padding:12px 16px;border-bottom:${T.border};display:flex;align-items:flex-start;gap:8px;"><p style="margin:0;width:22px;height:22px;border-radius:999px;background:${warn ? T.colors.warningSoft : done ? T.colors.accentSoft : T.colors.accentPale};color:${warn ? T.colors.warning : done ? T.colors.accent : T.colors.muted};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;flex-shrink:0;${done ? "" : `border:${T.border};`}">${symbols[state] || "•"}</p><section style="flex:1 1 0%;min-width:0;"><p style="margin:0 0 2px;font-size:17px;font-weight:800;color:${T.colors.text};line-height:1.55;${done ? "text-decoration:line-through;text-decoration-thickness:1px;" : ""}">${escapeHtml(heading)}</p><p style="margin:0;font-size:15px;color:${T.colors.muted};line-height:1.6;">${escapeHtml(body)}</p></section></section>`;
  }).join("");
  return moduleRoot(node, `${sectionLabel(node.title)}<section style="display:flex;flex-direction:column;gap:12px;">${rows}</section>`, "margin:0 0 30px;");
}

function renderToolbox(node: AdvancedModuleNode) {
  const rows = node.rows.map(([type = "", heading = "", body = "", url = ""]) => `<section style="background:linear-gradient(180deg,${T.colors.surface} 0%,${T.colors.accentPale} 100%);border:${T.border};border-radius:12px;padding:14px;box-shadow:${T.shadow};"><section style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px;">${pill(type)}<p style="margin:0;font-size:13px;color:${T.colors.muted};">↗</p></section><p style="margin:0 0 4px;font-size:17px;font-weight:800;line-height:1.55;">${link(url, heading)}</p><p style="margin:0;font-size:15px;color:${T.colors.muted};line-height:1.65;">${escapeHtml(body)}</p><p style="margin:8px 0 0;font-size:12px;color:${T.colors.accent};">${link(url, "打开资源 →")}</p></section>`).join("");
  return moduleRoot(node, `${sectionLabel(node.title)}<section style="display:flex;flex-direction:column;gap:12px;">${rows}</section>`, "margin:0 0 28px;");
}

function renderSpecs(node: AdvancedModuleNode) {
  const rows = node.rows.map(([label = "", value = "", noteValue = ""]) => `<section style="padding:12px 16px;border-bottom:${T.border};display:grid;grid-template-columns:1fr auto;gap:8px;align-items:baseline;"><p style="margin:0;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${T.colors.muted};">${escapeHtml(label)}</p><section style="min-width:0;"><p style="margin:0 0 2px;font-size:17px;font-weight:800;color:${T.colors.text};line-height:1.55;">${escapeHtml(value)}</p>${noteValue ? `<p style="margin:0;font-size:15px;color:${T.colors.muted};line-height:1.6;">${escapeHtml(noteValue)}</p>` : ""}</section></section>`).join("");
  return moduleRoot(node, `${sectionLabel(node.title)}<section style="display:flex;flex-direction:column;gap:12px;">${rows}</section>`, "margin:0 0 28px;");
}

function renderImageSteps(node: AdvancedModuleNode) {
  const rows = node.rows.map(([index = "", heading = "", body = "", src = "", alt = ""]) => `<section style="display:flex;flex-direction:column;align-items:stretch;gap:12px;background:linear-gradient(180deg,${T.colors.surface} 0%,${T.colors.accentPale} 100%);border:${T.border};border-radius:12px;padding:16px;box-shadow:${T.shadow};">${src ? `<section style="width:100%;min-width:0;flex-shrink:0;"><section style="border-radius:8px;overflow:hidden;background:${T.colors.accentPale};min-height:200px;border:${T.border};">${image(src, alt || heading, "height:100%;min-height:200px;object-fit:cover;border-radius:0;")}</section></section>` : ""}<section style="flex:1 1 0%;min-width:0;">${pill(index)}<p style="margin:8px 0 6px;font-size:17px;font-weight:800;color:${T.colors.text};line-height:1.55;">${escapeHtml(heading)}</p><p style="margin:0;font-size:15px;color:${T.colors.text};line-height:1.72;">${escapeHtml(body)}</p>${alt ? `<p style="margin:6px 0 0;font-size:13px;color:${T.colors.muted};line-height:1.6;">${escapeHtml(alt)}</p>` : ""}</section></section>`).join("");
  return moduleRoot(node, `${node.title ? pill(node.title) : ""}<section style="display:flex;flex-direction:column;gap:12px;margin-top:12px;">${rows}</section>`, "margin:0 0 28px;");
}

function renderNotice(node: AdvancedModuleNode) {
  const rows = node.rows.map(([label = "", heading = "", body = ""]) => {
    const warn = label === "风险";
    return `<section style="padding:12px 16px;border-bottom:${T.border};display:grid;grid-template-columns:96px 1fr;gap:12px;align-items:center;"><section style="display:flex;align-items:center;"><p style="display:inline-block;margin:0;font-size:13px;font-weight:700;color:${warn ? T.colors.warning : T.colors.accent};background:${warn ? T.colors.warningSoft : T.colors.accentSoft};border:1px solid ${warn ? T.colors.warning : T.colors.border};border-radius:8px;padding:4px 10px;text-align:center;min-width:64px;box-sizing:border-box;">${escapeHtml(label)}</p></section><section style="min-width:0;"><p style="margin:0 0 3px;font-size:15px;color:${T.colors.text};line-height:1.7;">${escapeHtml(heading)}</p><p style="margin:0;font-size:15px;color:${T.colors.muted};line-height:1.6;">${escapeHtml(body)}</p></section></section>`;
  }).join("");
  return moduleRoot(node, `${sectionLabel(node.title)}<section style="display:flex;flex-direction:column;gap:12px;">${rows}</section>`, "margin:0 0 28px;");
}

function extractMarkdownImages(body: string) {
  return [...body.matchAll(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g)].map((match) => ({ alt: match[1], src: match[2] }));
}

function renderGallery(node: AdvancedModuleNode) {
  const images = extractMarkdownImages(node.body);
  const cards = images.map((item) => `<figure style="margin:0;padding:16px 12px 12px;border-radius:12px;background:${T.colors.surface};border:${T.border};box-shadow:${T.shadow};flex:0 0 78%;max-width:360px;scroll-snap-align:start;scroll-snap-stop:always;display:flex;flex-direction:column;gap:8px;"><section style="border-radius:12px;overflow:hidden;background:${T.colors.surface};aspect-ratio:4/3;width:100%;">${image(item.src, item.alt, "height:100%;object-fit:cover;border-radius:0;")}</section><figcaption style="font-size:13px;color:${T.colors.muted};line-height:1.5;">${escapeHtml(item.alt)}</figcaption></figure>`).join("");
  return moduleRoot(node, `<section style="display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:8px;-webkit-overflow-scrolling:touch;">${cards}</section>${node.title ? `<p style="margin-top:8px;font-size:13px;color:${T.colors.muted};text-align:center;">${escapeHtml(node.title)}</p>` : ""}`, "margin:32px 0;overflow:hidden;");
}

function renderLongImage(node: AdvancedModuleNode) {
  const [item] = extractMarkdownImages(node.body);
  return moduleRoot(
    node,
    `<section style="margin:16px 8px 20px;padding:16px;background:linear-gradient(135deg,${T.colors.accentSoft},${T.colors.surface});border:1px solid ${T.colors.border};border-radius:12px;box-shadow:${T.shadow};position:relative;overflow:hidden;">${item ? `<section style="max-height:420px;max-height:min(75vh,600px);overflow-y:auto;border-radius:8px;background:${T.colors.surface};box-shadow:${T.shadow};border:${T.border};padding:4px;">${image(item.src, item.alt, "border-radius:0;")}</section><section style="text-align:center;font-size:12px;color:${T.colors.accent};margin:12px 0 0;padding:10px 16px;background:linear-gradient(135deg,${T.colors.accentSoft},rgba(179,89,59,0.12));border:1px solid ${T.colors.border};border-radius:12px;font-weight:500;letter-spacing:0.5px;">${escapeHtml(node.title || item.alt)}</section>` : ""}</section>`
  );
}

function renderDialogue(node: AdvancedModuleNode) {
  const lines = node.body.split("\n").map((line) => line.match(/^\s*([^:：]+)[:：]\s*(.+)$/)).filter((match): match is RegExpMatchArray => Boolean(match));
  const messages = lines.map((match, index) => {
    const own = index % 2 === 1;
    return `<section style="margin:10px 0;display:flex;align-items:flex-start;justify-content:${own ? "flex-end" : "flex-start"};${own ? "flex-direction:row-reverse;" : ""}"><span style="width:32px;height:32px;border-radius:50%;background:${own ? T.colors.muted : T.colors.accentAction};color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;flex-shrink:0;box-shadow:${T.shadow};${own ? "margin-left:10px;" : "margin-right:10px;"}">${escapeHtml(match[1].slice(0, 1))}</span><p style="max-width:80%;margin:0;padding:8px 14px;border:${T.border};border-radius:${own ? "16px 16px 4px 16px" : "16px 16px 16px 4px"};background:linear-gradient(135deg,${T.colors.surface},${T.colors.accentPale});color:${T.colors.text};font-size:15px;line-height:1.5;text-align:left;box-shadow:${T.shadow};">${escapeHtml(match[2])}</p></section>`;
  }).join("");
  return moduleRoot(node, `<section style="margin:12px 8px 16px;padding:12px;background:linear-gradient(135deg,${T.colors.surface},${T.colors.accentPale});border:1px solid ${T.colors.border};border-radius:12px;box-shadow:${T.shadow};">${node.title ? `<p style="margin:0 0 12px;padding-bottom:8px;text-align:center;font-size:17px;font-weight:600;color:${T.colors.accent};border-bottom:1px solid ${T.colors.border};">${escapeHtml(node.title)}</p>` : ""}${messages}</section>`);
}

function renderSummary(node: AdvancedModuleNode) {
  const f = node.fields;
  return moduleRoot(node, `${f.eyebrow ? `<p style="font-size:13px;color:${T.colors.accent};display:inline-block;margin:0 0 8px;padding:2px 8px;border-radius:999px;background:${T.colors.accentSoft};font-weight:700;">${escapeHtml(f.eyebrow)}</p>` : ""}<p style="color:${T.colors.text};font-size:17px;font-weight:800;display:block;line-height:1.45;margin:0;">${escapeHtml(f.highlight)}</p><p style="font-size:15px;color:${T.colors.text};line-height:1.7;margin:8px 0 0;">${escapeHtml(f.body)}</p>`, `background:linear-gradient(180deg,${T.colors.surface} 0%,${T.colors.accentPale} 100%);border:${T.border};border-left:3px solid ${T.colors.accent};border-radius:12px;padding:18px 18px 16px;margin:0 0 28px;text-align:left;box-shadow:${T.shadow};`);
}

function renderAuthorCard(node: AdvancedModuleNode) {
  const f = node.fields;
  return moduleRoot(node, `<section style="display:flex;align-items:center;gap:12px;margin:0 0 14px;"><span style="width:46px;height:46px;border-radius:15px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:linear-gradient(135deg,${T.colors.accentAction},${T.colors.accentAction});color:#fff;font-size:17px;font-weight:900;box-shadow:${T.shadow};">${escapeHtml((f.name || "作者").slice(0, 2))}</span><section style="min-width:0;flex:1 1 0%;"><p style="margin:0 0 3px;font-size:17px;font-weight:900;color:${T.colors.text};line-height:1.28;">${escapeHtml(f.name)}</p><p style="margin:0;font-size:13px;font-weight:800;color:${T.colors.muted};line-height:1.45;">${escapeHtml(f.role)}</p></section></section><p style="margin:0;font-size:15px;color:${T.colors.text};line-height:1.78;">${escapeHtml(f.bio)}</p>${pills(f.tags)}${f.note || f.link ? `<section style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:16px 0 0;padding-top:12px;border-top:${T.border};">${f.note ? `<p style="margin:0;flex:1 1 180px;font-size:15px;color:${T.colors.muted};line-height:1.65;">${escapeHtml(f.note)}</p>` : ""}${f.link ? `<p style="margin:0;font-size:13px;">${link(f.link, "了解作者 →")}</p>` : ""}</section>` : ""}`, `position:relative;overflow:hidden;margin:0 0 30px;padding:18px 18px 16px;background:linear-gradient(135deg,${T.colors.accentSoft} 0%,${T.colors.surface} 42%,${T.colors.accentPale} 100%);border:1px solid ${T.colors.border};border-radius:16px;box-shadow:${T.shadow};`);
}

function renderSeries(node: AdvancedModuleNode) {
  const f = node.fields;
  return moduleRoot(node, `<section style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:0 0 12px;"><strong style="color:${T.colors.accent};font-size:13px;">${escapeHtml(f.name || "系列")}</strong><span style="color:${T.colors.muted};font-size:12px;">${escapeHtml(f.issue)}</span></section><p style="margin:0;font-size:17px;font-weight:900;color:${T.colors.text};line-height:1.38;">${escapeHtml(f.title)}</p>${text(f.desc)}${pills(f.tags)}${f.next ? `<p style="margin:15px 0 0;padding:11px 12px;border-radius:8px;background:linear-gradient(180deg,${T.colors.accentSoft} 0%,${T.colors.accentPale} 100%);border:1px solid ${T.colors.border};color:${T.colors.text};font-size:15px;font-weight:800;line-height:1.62;">${escapeHtml(f.next)}</p>` : ""}`, `margin:0 0 30px;padding:18px 18px 16px;background:${T.colors.surface};border:${T.border};border-radius:16px;box-shadow:${T.shadow};`);
}

function renderSubscribe(node: AdvancedModuleNode) {
  const f = node.fields;
  const action = (value: string, accent: boolean) => `<span style="display:block;padding:10px 12px;border-radius:10px;text-align:center;background:${accent ? T.colors.accentAction : T.colors.surface};color:${accent ? "#fff" : T.colors.text};border:1px solid ${T.colors.border};font-size:14px;font-weight:800;">${escapeHtml(value)}</span>`;
  return moduleRoot(node, `${f.label ? `<p style="display:inline-block;margin:0 0 10px;padding:3px 9px;border-radius:999px;background:${T.colors.surface};border:${T.border};color:${T.colors.accent};font-size:13px;font-weight:900;">${escapeHtml(f.label)}</p>` : ""}<p style="margin:0;font-size:17px;font-weight:900;color:${T.colors.text};line-height:1.42;">${escapeHtml(f.title)}</p>${text(f.subtitle)}<section style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:16px 0 0;">${action(f.primary, true)}${f.secondary ? action(f.secondary, false) : ""}</section>${note(f.note)}`, `margin:0 0 30px;padding:20px 18px 16px;background:linear-gradient(180deg,${T.colors.accentSoft} 0%,${T.colors.surface} 72%,${T.colors.surface} 100%);border:1px solid ${T.colors.border};border-radius:16px;box-shadow:${T.shadow};`);
}

function renderCta(node: AdvancedModuleNode) {
  const f = node.fields;
  const actions = [
    {
      label: "保存灵感",
      icon: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>',
      accent: false,
    },
    {
      label: "直接套用",
      icon: '<rect x="3" y="7" width="8" height="8" rx="2"></rect><rect x="13" y="3" width="8" height="8" rx="2"></rect><rect x="13" y="13" width="8" height="8" rx="2"></rect>',
      accent: false,
    },
    {
      label: "继续体验",
      icon: '<path d="M7 17L17 7"></path><path d="M7 7h10v10"></path>',
      accent: true,
    },
  ];
  const actionCards = actions
    .map(
      ({ label, icon, accent }) =>
        `<section style="text-align:center;color:${accent ? "#ffffff" : T.colors.text};min-width:0;background:${accent ? `linear-gradient(135deg,${T.colors.accentAction},${T.colors.accentAction})` : T.colors.accentPale};border:1px solid ${accent ? T.colors.border : "rgba(202,202,199,0.18)"};border-radius:12px;padding:12px 8px;${accent ? "box-shadow:0 2px 8px rgba(0,0,0,0.18);" : ""}"><section style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;margin:0 auto 6px;background:${accent ? "rgba(255,255,255,0.16)" : T.colors.surface};border-radius:8px;border:1px solid ${accent ? "rgba(255,255,255,0.22)" : "rgba(202,202,199,0.18)"};"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${icon}</svg></section><span style="font-size:13px;font-weight:700;">${label}</span></section>`
    )
    .join("");

  return shell(
    node,
    `<p style="font-size:17px;font-weight:800;color:${T.colors.text};margin:0 0 14px;line-height:1.45;">${escapeHtml(f.title)}</p><section data-mpa-cta-actions="true" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:${f.note ? "14px" : "0"};">${actionCards}</section>${f.note ? `<p style="font-size:13px;color:${T.colors.muted};letter-spacing:0.8px;margin:0;padding-top:12px;border-top:1px solid rgba(202,202,199,0.18);text-transform:uppercase;">${escapeHtml(f.note)}</p>` : ""}`,
    `background:linear-gradient(135deg,${T.colors.accentSoft} 0%,${T.colors.surface} 44%,${T.colors.accentPale} 100%);border:1px solid ${T.colors.border};border-radius:16px;padding:18px 18px 16px;text-align:left;margin:0 0 24px;`
  );
}

const RENDERERS: Record<AdvancedModuleNode["name"], (node: AdvancedModuleNode) => string> = {
  hero: renderHero,
  cards: renderCards,
  metrics: renderMetrics,
  infographic: renderInfographic,
  "audience-fit": renderAudienceFit,
  verdict: renderVerdict,
  people: renderPeople,
  cases: renderCases,
  pricing: renderPricing,
  faq: renderFaq,
  logos: renderLogos,
  part: renderPart,
  "label-title": renderLabelTitle,
  quote: renderQuote,
  "image-text": renderImageText,
  "image-compare": renderImageCompare,
  "image-annotate": renderImageAnnotate,
  toc: renderToc,
  checklist: renderChecklist,
  toolbox: renderToolbox,
  specs: renderSpecs,
  "image-steps": renderImageSteps,
  notice: renderNotice,
  gallery: renderGallery,
  longimage: renderLongImage,
  dialogue: renderDialogue,
  summary: renderSummary,
  "author-card": renderAuthorCard,
  series: renderSeries,
  subscribe: renderSubscribe,
  cta: renderCta,
};

export function renderAdvancedModule(node: AdvancedModuleNode) {
  T = getFormatTokens();
  return RENDERERS[node.name](node);
}
