import { Marked, Renderer } from "marked";
import sanitizeHtml from "sanitize-html";

const renderer = new Renderer();

renderer.html = () => "";

const marked = new Marked({
  gfm: true,
  breaks: false,
  renderer,
});

const ALLOWED_TAGS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "br",
  "strong",
  "em",
  "del",
  "blockquote",
  "ul",
  "ol",
  "li",
  "input",
  "a",
  "img",
  "hr",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "code",
  "pre",
  "section",
  "sup",
];

export type GfmTagStyleMap = Partial<Record<(typeof ALLOWED_TAGS)[number], string>>;

const ALERT_META = {
  NOTE: { label: "提示", color: "#478be6", background: "rgba(71,139,230,0.08)" },
  TIP: { label: "技巧", color: "#57ab5a", background: "rgba(87,171,90,0.08)" },
  IMPORTANT: { label: "重要", color: "#a855f7", background: "rgba(168,85,247,0.08)" },
  WARNING: { label: "警告", color: "#f59e0b", background: "rgba(245,158,11,0.08)" },
  CAUTION: { label: "注意", color: "#ef4444", background: "rgba(239,68,68,0.08)" },
} as const;

type FootnoteDefinition = {
  id: string;
  label: string;
  content: string;
  index: number;
};

function footnoteId(label: string) {
  const normalized = label.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  return normalized.replace(/^-+|-+$/g, "") || "note";
}

function extractFootnotes(markdown: string) {
  const definitions: FootnoteDefinition[] = [];
  const definitionByLabel = new Map<string, FootnoteDefinition>();
  const withoutDefinitions = markdown
    .split("\n")
    .filter((line) => {
      const match = line.match(/^\[\^([^\]]+)\]:\s*(.*)$/);
      if (!match) return true;
      const definition = {
        id: footnoteId(match[1]),
        label: match[1],
        content: match[2],
        index: definitions.length + 1,
      };
      definitions.push(definition);
      definitionByLabel.set(match[1], definition);
      return false;
    })
    .join("\n");

  const references = new Map<string, FootnoteDefinition>();
  const content = withoutDefinitions.replace(/\[\^([^\]]+)\]/g, (raw, label) => {
    const definition = definitionByLabel.get(label);
    if (!definition) return raw;
    references.set(label, definition);
    return `FOOTNOTE_REF_TOKEN_${definition.index}`;
  });

  return { content, definitions: definitions.filter((item) => references.has(item.label)) };
}

function renderAlerts(html: string) {
  return html.replace(
    /<blockquote>\s*<p>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n?([\s\S]*?)<\/p>\s*<\/blockquote>/gi,
    (_match, rawType: keyof typeof ALERT_META, content: string) => {
      const type = rawType.toUpperCase() as keyof typeof ALERT_META;
      const meta = ALERT_META[type];
      return `<blockquote class="markdown-alert markdown-alert-${type.toLowerCase()}" style="margin:24px 0;padding:18px 20px;border:1px solid ${meta.color}33;border-left:4px solid ${meta.color};border-radius:10px;background:${meta.background};"><p class="markdown-alert-title" style="margin:0 0 8px;color:${meta.color};font-weight:700;">${meta.label}</p><p style="margin:0;">${content.trim()}</p></blockquote>`;
    }
  );
}

function renderFootnotes(html: string, definitions: FootnoteDefinition[]) {
  if (definitions.length === 0) return html;

  let content = html;
  for (const definition of definitions) {
    content = content.replaceAll(
      `FOOTNOTE_REF_TOKEN_${definition.index}`,
      `<sup id="fnref-${definition.id}"><a href="#fn-${definition.id}" aria-label="脚注 ${definition.index}">${definition.index}</a></sup>`
    );
  }

  const items = definitions
    .map(
      (definition) =>
        `<li id="fn-${definition.id}">${marked.parseInline(definition.content, { async: false })}<a href="#fnref-${definition.id}" aria-label="返回脚注引用 ${definition.index}">↩︎</a></li>`
    )
    .join("");

  return `${content}<section class="footnotes"><hr><ol>${items}</ol></section>`;
}

export function renderSafeGfm(
  markdown: string,
  options: { tagStyles?: GfmTagStyleMap } = {}
) {
  const footnotes = extractFootnotes(markdown);
  const parsed = renderFootnotes(
    renderAlerts(marked.parse(footnotes.content, { async: false })),
    footnotes.definitions
  );
  const transformTags: Record<
    string,
    (tagName: string, attribs: Record<string, string>) => {
      tagName: string;
      attribs: Record<string, string>;
    }
  > = {};

  for (const [tag, style] of Object.entries(options.tagStyles ?? {})) {
    if (!style) continue;
    transformTags[tag] = (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        style: `${attribs.style ? `${attribs.style};` : ""}${style}`,
      },
    });
  }

  transformTags.a = (tagName, attribs) => {
    const nextAttribs: Record<string, string> = { ...attribs };

    if (/^https?:\/\//i.test(attribs.href ?? "")) {
      nextAttribs.target = "_blank";
      nextAttribs.rel = "noopener noreferrer";
    }
    if (options.tagStyles?.a) {
      nextAttribs.style = options.tagStyles.a;
    }

    return {
      tagName,
      attribs: nextAttribs,
    };
  };

  return sanitizeHtml(parsed, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      blockquote: ["class"],
      img: ["src", "alt", "title"],
      input: ["type", "checked", "disabled"],
      li: ["id"],
      p: ["class"],
      section: ["class"],
      sup: ["id"],
      code: ["class"],
      ol: ["start"],
      "*": ["style"],
    },
    allowedClasses: {
      blockquote: [
        "markdown-alert",
        "markdown-alert-note",
        "markdown-alert-tip",
        "markdown-alert-important",
        "markdown-alert-warning",
        "markdown-alert-caution",
      ],
      code: [/^language-[a-z0-9_+-]+$/i],
      p: ["markdown-alert-title"],
      section: ["footnotes"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https"],
    },
    allowProtocolRelative: false,
    transformTags,
  });
}
