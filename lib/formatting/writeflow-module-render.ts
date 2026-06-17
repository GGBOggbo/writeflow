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
  return root(
    node.name,
    `<p style="margin:0 0 6px;font-size:18px;line-height:1.2;color:${T.colors.accent};font-weight:800;">${escapeHtml(node.fields.index)}</p><p style="margin:0;font-size:18px;line-height:1.55;color:${T.colors.text};font-weight:800;">${escapeHtml(node.fields.title)}</p>${node.fields.subtitle ? `<p style="margin:8px 0 0;font-size:14px;line-height:1.7;color:${T.colors.muted};">${escapeHtml(node.fields.subtitle)}</p>` : ""}`,
    "padding-top:8px;"
  );
}

function renderWfPullquote(node: AdvancedModuleNode) {
  const T = getFormatTokens();
  return root(
    node.name,
    `${label(node.fields.label)}<p style="margin:0;padding:0 0 0 14px;border-left:3px solid ${T.colors.accent};font-size:17px;line-height:1.85;font-weight:700;color:${T.colors.text};">${escapeHtml(node.fields.quote)}</p>${node.fields.source ? `<p style="margin:10px 0 0;padding-left:17px;font-size:13px;line-height:1.6;color:${T.colors.muted};">${escapeHtml(node.fields.source)}</p>` : ""}`
  );
}

function renderRows(node: AdvancedModuleNode, kind: "points" | "steps" | "compare") {
  const T = getFormatTokens();
  const rows = node.rows
    .map(([index = "", heading = "", body = ""]) =>
      `<section style="box-sizing:border-box;margin:0 0 12px;padding:12px 0;border-bottom:1px solid ${T.colors.border};"><p style="margin:0 0 5px;font-size:13px;line-height:1.4;color:${T.colors.accent};font-weight:700;">${escapeHtml(index)}</p><p style="margin:0 0 6px;font-size:16px;line-height:1.55;color:${T.colors.text};font-weight:700;">${escapeHtml(heading)}</p><p style="margin:0;font-size:15px;line-height:1.8;color:${T.colors.text};">${escapeHtml(body)}</p></section>`
    )
    .join("");

  return root(`wf-${kind}`, rows);
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
      return renderRows(node, "compare");
    case "wf-image-note":
      return renderWfImageNote(node);
    default:
      return "";
  }
}
