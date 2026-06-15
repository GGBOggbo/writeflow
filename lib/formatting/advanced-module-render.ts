import type { AdvancedModuleNode } from "@/lib/markdown/advanced-modules";
import { WECHAT_NATIVE_TOKENS as T } from "./wechat-native-tokens";

const baseCard = [
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
  return `<section data-mpa-action-id="${node.name}" style="${baseCard};${style}">${content}</section>`;
}

function moduleHeading(node: AdvancedModuleNode, fallback = "") {
  const value = node.title || fallback;
  return value
    ? `<div style="margin-bottom:18px;">${title(value, 20)}</div>`
    : "";
}

function rowCard(content: string, accent = false) {
  return `<section style="margin-top:12px;padding:16px;border-radius:${T.radius.medium};border:1px solid ${accent ? T.colors.accent : T.colors.border};background:${accent ? T.colors.accentSoft : T.colors.accentPale};">${content}</section>`;
}

function isAccent(value = "") {
  return value.trim().toLowerCase() === "accent";
}

function renderHero(node: AdvancedModuleNode) {
  const f = node.fields;
  return shell(
    node,
    `<div style="position:relative;">${eyebrow(f.eyebrow)}${title(f.title, 30)}${text(f.subtitle, `color:${T.colors.text};font-size:16px;`)}${pills(f.tags)}${f.meta || f.brand ? `<p style="margin:16px 0 0;color:${T.colors.muted};font-size:12px;">${escapeHtml([f.brand, f.meta].filter(Boolean).join(" · "))}</p>` : ""}</div>${f.image ? `<div style="margin-top:20px;">${image(f.image, f.title || "封面图片")}</div>` : ""}`,
    `background:linear-gradient(145deg,${T.colors.surface} 0%,${T.colors.accentSoft} 100%);border-color:${T.colors.accent};padding:28px;`
  );
}

function renderCards(node: AdvancedModuleNode) {
  return shell(
    node,
    moduleHeading(node) +
      node.rows
        .map(([index = "", heading = "", body = "", tone = ""]) =>
          rowCard(
            `<p style="margin:0;color:${T.colors.accent};font-size:12px;font-weight:800;letter-spacing:0.08em;">${escapeHtml(index)}</p>${title(heading, 18)}${text(body)}`,
            isAccent(tone)
          )
        )
        .join("")
  );
}

function renderMetrics(node: AdvancedModuleNode) {
  return shell(
    node,
    moduleHeading(node) +
      node.rows
        .map(([label = "", value = "", description = "", tone = ""]) =>
          rowCard(
            `<p style="margin:0;color:${T.colors.muted};font-size:13px;font-weight:700;">${escapeHtml(label)}</p><p style="margin:4px 0;color:${T.colors.accent};font-size:28px;font-weight:900;line-height:1.2;">${escapeHtml(value)}</p>${text(description)}`,
            isAccent(tone)
          )
        )
        .join("")
  );
}

function renderInfographic(node: AdvancedModuleNode) {
  const f = node.fields;
  return shell(
    node,
    `${eyebrow(f.eyebrow)}${title(f.title, 27)}${text(f.subtitle)}${f.quote ? `<blockquote style="margin:18px 0 0;padding:14px 16px;border-left:4px solid ${T.colors.accent};background:${T.colors.accentSoft};color:${T.colors.accentStrong};font-size:16px;font-weight:700;">${escapeHtml(f.quote)}</blockquote>` : ""}${note(f.note)}`,
    `background:${T.colors.accentPale};`
  );
}

function renderAudienceFit(node: AdvancedModuleNode) {
  const f = node.fields;
  const group = (label: string, value: string, positive: boolean) =>
    value
      ? `<section style="margin-top:14px;padding:16px;border-radius:${T.radius.medium};background:${positive ? T.colors.accentSoft : T.colors.dangerSoft};"><p style="margin:0 0 8px;color:${positive ? T.colors.accent : T.colors.danger};font-size:13px;font-weight:800;">${label}</p>${splitList(value).map((item) => `<p style="margin:5px 0;color:${T.colors.text};font-size:14px;">${positive ? "✓" : "×"} ${escapeHtml(item)}</p>`).join("")}</section>`
      : "";
  return shell(node, `${title(f.title || node.title || "适用人群", 21)}${group("适合", f.fit, true)}${group("不太适合", f.avoid, false)}`);
}

function renderVerdict(node: AdvancedModuleNode) {
  const f = node.fields;
  return shell(node, `${eyebrow(f.eyebrow)}${title(f.title, 25)}${text(f.body, `color:${T.colors.text};font-size:16px;`)}`, `border:2px solid ${T.colors.accent};background:${T.colors.accentSoft};`);
}

function renderPeople(node: AdvancedModuleNode) {
  return shell(
    node,
    moduleHeading(node) +
      node.rows.map(([name = "", role = "", body = "", tone = ""]) => rowCard(`<div style="display:inline-block;width:36px;height:36px;border-radius:50%;background:${T.colors.accent};color:#fff;text-align:center;line-height:36px;font-weight:800;">${escapeHtml(name.slice(0, 1))}</div><p style="margin:10px 0 0;color:${T.colors.text};font-size:17px;font-weight:800;">${escapeHtml(name)}</p><p style="margin:2px 0;color:${T.colors.accent};font-size:12px;font-weight:700;">${escapeHtml(role)}</p>${text(body)}`, isAccent(tone))).join("")
  );
}

function renderCases(node: AdvancedModuleNode) {
  return shell(node, moduleHeading(node) + node.rows.map(([name = "", result = "", body = "", tone = ""]) => rowCard(`${title(name, 17)}<p style="margin:8px 0 0;color:${T.colors.accent};font-size:20px;font-weight:900;">${escapeHtml(result)}</p>${text(body)}`, isAccent(tone))).join(""));
}

function renderPricing(node: AdvancedModuleNode) {
  return shell(node, moduleHeading(node) + node.rows.map(([name = "", price = "", features = "", tone = ""]) => rowCard(`${title(name, 18)}<p style="margin:8px 0;color:${T.colors.accent};font-size:28px;font-weight:900;">${escapeHtml(price)}</p>${splitList(features.replaceAll("/", "|")).map((item) => `<p style="margin:5px 0;color:${T.colors.muted};font-size:14px;">✓ ${escapeHtml(item)}</p>`).join("")}`, isAccent(tone))).join(""));
}

function renderFaq(node: AdvancedModuleNode) {
  return shell(node, moduleHeading(node) + node.rows.map(([question = "", answer = ""]) => `<section style="margin-top:12px;padding:16px;border-radius:${T.radius.medium};background:${T.colors.accentPale};"><p data-mpa-action-id="faq_question" style="margin:0;color:${T.colors.text};font-size:15px;font-weight:800;">Q · ${escapeHtml(question)}</p><p data-mpa-action-id="faq_answer" style="margin:9px 0 0;color:${T.colors.muted};font-size:14px;line-height:1.75;">A · ${escapeHtml(answer)}</p></section>`).join(""));
}

function renderLogos(node: AdvancedModuleNode) {
  return shell(node, moduleHeading(node) + `<div style="text-align:center;">${node.rows.map(([name = "", desc = ""]) => `<span style="display:inline-block;min-width:120px;margin:6px;padding:12px 14px;border:${T.border};border-radius:${T.radius.medium};background:${T.colors.accentPale};"><strong style="display:block;color:${T.colors.text};font-size:15px;">${escapeHtml(name)}</strong><small style="color:${T.colors.muted};">${escapeHtml(desc)}</small></span>`).join("")}</div>`);
}

function renderPart(node: AdvancedModuleNode) {
  const f = node.fields;
  return shell(node, `<p style="margin:0;color:${T.colors.accent};font-size:34px;font-weight:900;line-height:1;">${escapeHtml(f.index)}</p><div style="margin-top:12px;">${title(f.title, 24)}${text(f.subtitle, "font-size:12px;letter-spacing:0.08em;")}</div>`, `border-left:6px solid ${T.colors.accent};box-shadow:none;`);
}

function renderLabelTitle(node: AdvancedModuleNode) {
  const f = node.fields;
  return shell(node, `${pill(f.label || "重点")}<div style="margin-top:12px;">${title(f.title, 22)}</div>`, `padding:18px 20px;box-shadow:none;`);
}

function renderQuote(node: AdvancedModuleNode) {
  const f = node.fields;
  return shell(node, `${eyebrow(f.eyebrow)}<p style="margin:0;color:${T.colors.accentStrong};font-family:Georgia,'Times New Roman',serif;font-size:23px;font-weight:700;line-height:1.6;">“${escapeHtml(f.quote)}”</p>${f.source ? `<p style="margin:14px 0 0;color:${T.colors.muted};font-size:13px;">— ${escapeHtml(f.source)}</p>` : ""}${note(f.note)}`, `background:${T.colors.accentSoft};border-left:5px solid ${T.colors.accent};`);
}

function renderImageText(node: AdvancedModuleNode) {
  const f = node.fields;
  return shell(node, `${eyebrow(f.eyebrow)}${title(f.title, 21)}${f.image ? `<div style="margin-top:16px;">${image(f.image, f.alt || f.title)}</div>` : ""}${text(f.body)}${note(f.note)}`);
}

function renderImageCompare(node: AdvancedModuleNode) {
  const f = node.fields;
  const item = (label: string, src: string) => `<section style="margin-top:14px;">${title(label, 16)}<div style="margin-top:8px;">${image(src, label)}</div></section>`;
  return shell(node, `${eyebrow(f.eyebrow)}${title(f.title, 21)}${item(f.left_title, f.left_image)}${item(f.right_title, f.right_image)}${note(f.note)}`);
}

function renderImageAnnotate(node: AdvancedModuleNode) {
  const f = node.fields;
  const points = node.fieldEntries.filter(({ key }) => key === "point").map(({ value }) => splitList(value));
  return shell(node, `${eyebrow(f.eyebrow)}${title(f.title, 21)}<div style="margin-top:16px;">${image(f.image, f.alt || f.title)}</div>${points.map(([index = "", , , heading = "", body = ""]) => rowCard(`<p style="margin:0;color:${T.colors.accent};font-size:12px;font-weight:900;">${escapeHtml(index)}</p>${title(heading, 16)}${text(body)}`)).join("")}${note(f.note)}`);
}

function renderToc(node: AdvancedModuleNode) {
  return shell(node, moduleHeading(node) + node.rows.map(([index = "", heading = "", body = ""]) => `<section style="display:block;margin-top:10px;padding:12px 0;border-bottom:1px solid ${T.colors.border};"><span style="display:inline-block;width:42px;color:${T.colors.accent};font-weight:900;vertical-align:top;">${escapeHtml(index)}</span><span style="display:inline-block;width:calc(100% - 48px);"><strong style="display:block;color:${T.colors.text};">${escapeHtml(heading)}</strong><small style="color:${T.colors.muted};">${escapeHtml(body)}</small></span></section>`).join(""), "box-shadow:none;");
}

function renderChecklist(node: AdvancedModuleNode) {
  const symbols: Record<string, string> = { done: "✓", pending: "○", warn: "!" };
  return shell(node, moduleHeading(node) + node.rows.map(([state = "", heading = "", body = ""]) => rowCard(`<span style="display:inline-block;width:28px;height:28px;border-radius:50%;background:${state === "warn" ? T.colors.warningSoft : T.colors.accentSoft};color:${state === "warn" ? T.colors.warning : T.colors.accent};text-align:center;line-height:28px;font-weight:900;">${symbols[state] || "•"}</span><strong style="margin-left:8px;color:${T.colors.text};font-size:15px;">${escapeHtml(heading)}</strong>${text(body)}`)).join(""));
}

function renderToolbox(node: AdvancedModuleNode) {
  return shell(node, moduleHeading(node) + node.rows.map(([type = "", heading = "", body = "", url = ""]) => rowCard(`${pill(type)}<div style="margin-top:9px;">${title(heading, 17)}${text(body)}<p style="margin:10px 0 0;font-size:13px;">${link(url, "打开资源 →")}</p></div>`)).join(""));
}

function renderSpecs(node: AdvancedModuleNode) {
  return shell(node, moduleHeading(node) + `<table style="width:100%;border-collapse:collapse;font-family:${T.font};">${node.rows.map(([label = "", value = "", noteValue = ""]) => `<tr><th style="width:25%;padding:12px 8px;border-bottom:1px solid ${T.colors.border};color:${T.colors.accent};font-size:13px;text-align:left;vertical-align:top;">${escapeHtml(label)}</th><td style="padding:12px 8px;border-bottom:1px solid ${T.colors.border};color:${T.colors.text};font-size:14px;vertical-align:top;"><strong>${escapeHtml(value)}</strong>${noteValue ? `<small style="display:block;margin-top:4px;color:${T.colors.muted};">${escapeHtml(noteValue)}</small>` : ""}</td></tr>`).join("")}</table>`);
}

function renderImageSteps(node: AdvancedModuleNode) {
  return shell(node, moduleHeading(node) + node.rows.map(([index = "", heading = "", body = "", src = "", alt = ""]) => rowCard(`<p style="margin:0;color:${T.colors.accent};font-size:24px;font-weight:900;">${escapeHtml(index)}</p>${title(heading, 18)}${text(body)}${src ? `<div style="margin-top:12px;">${image(src, alt || heading)}</div>` : ""}`)).join(""));
}

function renderNotice(node: AdvancedModuleNode) {
  return shell(node, moduleHeading(node) + node.rows.map(([label = "", heading = "", body = ""]) => `<section style="margin-top:12px;padding:14px 16px;border-left:4px solid ${label === "风险" ? T.colors.warning : T.colors.accent};background:${label === "风险" ? T.colors.warningSoft : T.colors.accentPale};"><strong style="display:block;color:${T.colors.text};font-size:15px;">${escapeHtml(label)} · ${escapeHtml(heading)}</strong>${text(body)}</section>`).join(""), "box-shadow:none;");
}

function extractMarkdownImages(body: string) {
  return [...body.matchAll(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g)].map((match) => ({ alt: match[1], src: match[2] }));
}

function renderGallery(node: AdvancedModuleNode) {
  const images = extractMarkdownImages(node.body);
  return shell(node, `${moduleHeading(node)}<div style="white-space:nowrap;overflow-x:auto;padding-bottom:8px;">${images.map((item) => `<figure style="display:inline-block;width:82%;margin:0 12px 0 0;vertical-align:top;white-space:normal;">${image(item.src, item.alt)}<figcaption style="margin-top:6px;color:${T.colors.muted};font-size:12px;text-align:center;">${escapeHtml(item.alt)}</figcaption></figure>`).join("")}</div>`);
}

function renderLongImage(node: AdvancedModuleNode) {
  const [item] = extractMarkdownImages(node.body);
  return shell(node, `${moduleHeading(node)}${item ? image(item.src, item.alt) : ""}${item ? `<p style="margin:8px 0 0;color:${T.colors.muted};font-size:12px;text-align:center;">${escapeHtml(item.alt)}</p>` : ""}`, "padding:18px;");
}

function renderDialogue(node: AdvancedModuleNode) {
  const lines = node.body.split("\n").map((line) => line.match(/^\s*([^:：]+)[:：]\s*(.+)$/)).filter((match): match is RegExpMatchArray => Boolean(match));
  return shell(node, moduleHeading(node) + lines.map((match, index) => { const own = index % 2 === 1; return `<section style="margin-top:12px;text-align:${own ? "right" : "left"};"><span style="display:block;margin-bottom:4px;color:${T.colors.muted};font-size:11px;font-weight:700;">${escapeHtml(match[1])}</span><p style="display:inline-block;max-width:84%;margin:0;padding:10px 13px;border-radius:${T.radius.medium};background:${own ? T.colors.accent : T.colors.accentSoft};color:${own ? "#ffffff" : T.colors.text};font-size:14px;line-height:1.7;text-align:left;">${escapeHtml(match[2])}</p></section>`; }).join(""), `background:${T.colors.accentPale};`);
}

function renderSummary(node: AdvancedModuleNode) {
  const f = node.fields;
  return shell(node, `${eyebrow(f.eyebrow)}<p style="margin:0;color:${T.colors.accentStrong};font-size:23px;font-weight:900;line-height:1.5;">${escapeHtml(f.highlight)}</p>${text(f.body, `color:${T.colors.text};`)}`, `background:${T.colors.accentSoft};border-top:5px solid ${T.colors.accent};`);
}

function renderAuthorCard(node: AdvancedModuleNode) {
  const f = node.fields;
  return shell(node, `<div style="display:inline-block;width:54px;height:54px;border-radius:50%;background:${T.colors.accent};color:#fff;text-align:center;line-height:54px;font-size:22px;font-weight:900;vertical-align:top;">${escapeHtml((f.name || "作").slice(0, 1))}</div><div style="display:inline-block;width:calc(100% - 70px);margin-left:12px;vertical-align:top;">${title(f.name, 19)}<p style="margin:2px 0;color:${T.colors.accent};font-size:12px;font-weight:700;">${escapeHtml(f.role)}</p></div>${text(f.bio)}${pills(f.tags)}${note(f.note)}${f.link ? `<p style="margin:12px 0 0;font-size:13px;">${link(f.link, "了解作者 →")}</p>` : ""}`);
}

function renderSeries(node: AdvancedModuleNode) {
  const f = node.fields;
  return shell(node, `${eyebrow(`${f.name || "系列"}${f.issue ? ` · ${f.issue}` : ""}`)}${title(f.title, 22)}${text(f.desc)}${pills(f.tags)}${f.next ? `<p style="margin:16px 0 0;padding:12px 14px;border-radius:${T.radius.medium};background:${T.colors.accentSoft};color:${T.colors.accentStrong};font-size:14px;font-weight:700;">${escapeHtml(f.next)}</p>` : ""}`);
}

function renderSubscribe(node: AdvancedModuleNode) {
  const f = node.fields;
  return shell(node, `${eyebrow(f.label)}${title(f.title, 22)}${text(f.subtitle)}<div style="margin-top:18px;"><span style="display:inline-block;margin:0 8px 8px 0;padding:10px 16px;border-radius:${T.radius.pill};background:${T.colors.accent};color:#fff;font-size:14px;font-weight:800;">${escapeHtml(f.primary)}</span>${f.secondary ? `<span style="display:inline-block;padding:9px 15px;border:1px solid ${T.colors.accent};border-radius:${T.radius.pill};color:${T.colors.accent};font-size:14px;font-weight:700;">${escapeHtml(f.secondary)}</span>` : ""}</div>${note(f.note)}`, `text-align:center;background:${T.colors.accentPale};`);
}

function renderCta(node: AdvancedModuleNode) {
  const f = node.fields;
  return shell(node, `${title(f.title, 23)}${f.note ? `<p style="margin:14px 0 0;color:rgba(255,255,255,0.78);font-size:12px;font-weight:700;letter-spacing:0.1em;">${escapeHtml(f.note)}</p>` : ""}`, `text-align:center;background:${T.colors.accent};border-color:${T.colors.accent};color:#fff;`)
    .replace(`color:${T.colors.text};font-size:23px`, "color:#ffffff;font-size:23px");
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
  return RENDERERS[node.name](node);
}
