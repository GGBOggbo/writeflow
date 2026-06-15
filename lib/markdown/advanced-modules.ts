export const ADVANCED_MODULE_NAMES = [
  "hero",
  "cards",
  "metrics",
  "infographic",
  "audience-fit",
  "verdict",
  "people",
  "cases",
  "pricing",
  "faq",
  "logos",
  "part",
  "label-title",
  "quote",
  "image-text",
  "image-compare",
  "image-annotate",
  "toc",
  "checklist",
  "toolbox",
  "specs",
  "image-steps",
  "notice",
  "gallery",
  "longimage",
  "dialogue",
  "summary",
  "author-card",
  "series",
  "subscribe",
  "cta",
] as const;

export type AdvancedModuleName = (typeof ADVANCED_MODULE_NAMES)[number];

const MODULE_NAME_SET = new Set<string>(ADVANCED_MODULE_NAMES);

const ROW_MODULES = new Set<AdvancedModuleName>([
  "cards",
  "metrics",
  "people",
  "cases",
  "pricing",
  "faq",
  "logos",
  "toc",
  "checklist",
  "toolbox",
  "specs",
  "image-steps",
  "notice",
]);

const SPECIAL_MODULES = new Set<AdvancedModuleName>([
  "gallery",
  "longimage",
  "dialogue",
]);

export type MarkdownArticleNode = {
  type: "markdown";
  content: string;
};

export type AdvancedModuleNode = {
  type: "module";
  name: AdvancedModuleName;
  title?: string;
  body: string;
  fields: Record<string, string>;
  fieldEntries: Array<{ key: string; value: string }>;
  rows: string[][];
  raw: string;
};

export type ArticleNode = MarkdownArticleNode | AdvancedModuleNode;

function pushMarkdown(nodes: ArticleNode[], lines: string[]) {
  const content = lines.join("\n").trim();
  if (content) nodes.push({ type: "markdown", content });
}

function parseFieldEntries(body: string) {
  return body
    .split("\n")
    .map((line) => line.match(/^\s*([a-zA-Z0-9_.-]+)\s*:\s*(.*)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({ key: match[1], value: match[2].trim() }));
}

function moduleNode(
  name: AdvancedModuleName,
  title: string | undefined,
  body: string,
  raw: string
): AdvancedModuleNode {
  const fieldEntries = ROW_MODULES.has(name) || SPECIAL_MODULES.has(name)
    ? []
    : parseFieldEntries(body);
  const fields = Object.fromEntries(
    fieldEntries.map(({ key, value }) => [key, value])
  );
  const rows = ROW_MODULES.has(name)
    ? body
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.split("|").map((cell) => cell.trim()))
    : [];

  return {
    type: "module",
    name,
    title: title?.trim() || undefined,
    body,
    fields,
    fieldEntries,
    rows,
    raw,
  };
}

export function parseAdvancedMarkdown(markdown: string): ArticleNode[] {
  const normalized = markdown.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  const nodes: ArticleNode[] = [];
  let markdownLines: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const opening = lines[index].match(
      /^:::([a-z0-9-]+)(?:\[([^\]]*)\])?\s*$/i
    );
    if (!opening || !MODULE_NAME_SET.has(opening[1])) {
      markdownLines.push(lines[index]);
      continue;
    }

    let closingIndex = index + 1;
    while (closingIndex < lines.length && lines[closingIndex].trim() !== ":::") {
      closingIndex += 1;
    }

    if (closingIndex >= lines.length) {
      markdownLines.push(...lines.slice(index));
      break;
    }

    pushMarkdown(nodes, markdownLines);
    markdownLines = [];

    const body = lines.slice(index + 1, closingIndex).join("\n").trim();
    const raw = lines.slice(index, closingIndex + 1).join("\n");
    nodes.push(
      moduleNode(
        opening[1] as AdvancedModuleName,
        opening[2],
        body,
        raw
      )
    );
    index = closingIndex;
  }

  pushMarkdown(nodes, markdownLines);
  return nodes;
}

export function hasAdvancedModules(markdown: string) {
  return parseAdvancedMarkdown(markdown).some((node) => node.type === "module");
}
