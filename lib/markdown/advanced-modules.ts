import {
  MODULE_DEFS,
  isAdvancedModuleName,
  type AdvancedModuleName,
  type FieldModuleDef,
} from "./module-defs";

export {
  ADVANCED_MODULE_NAMES,
  type AdvancedModuleName,
} from "./module-defs";

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
  "wf-points",
  "wf-steps",
  "wf-compare",
  "wf-toc",
  "wf-timeline",
  "wf-proscons",
  "wf-stats",
  "wf-checklist",
  "wf-people",
  "wf-gallery",
  "wf-stats-grid",
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

export type AdvancedModuleContractValidation =
  | { ok: true }
  | {
      ok: false;
      module: AdvancedModuleName;
      reason: string;
    };

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
    if (!opening || !isAdvancedModuleName(opening[1])) {
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
        opening[1],
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

function invalidContract(
  module: AdvancedModuleName,
  reason: string
): AdvancedModuleContractValidation {
  return { ok: false, module, reason };
}

function contentLength(value: string) {
  return Array.from(value.trim()).length;
}

function comparableFieldValue(value: string) {
  return value
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .toLowerCase();
}

export function validateAdvancedModuleNode(
  node: AdvancedModuleNode
): AdvancedModuleContractValidation {
  const definition = MODULE_DEFS[node.name];

  if (definition.kind === "fields") {
    const repeated = "repeated" in definition ? definition.repeated : undefined;
    const repeatedKeys = new Set<string>(
      repeated?.map(({ key }) => key) ?? []
    );
    const allowedKeys = new Set<string>([
      ...definition.required,
      ...definition.optional,
      ...repeatedKeys,
    ]);
    const counts = new Map<string, number>();
    const bodyLines = node.body.split("\n");

    for (const [index, line] of bodyLines.entries()) {
      if (!line.trim()) continue;
      if (!/^\s*[a-zA-Z0-9_.-]+\s*:\s*.*$/.test(line)) {
        return invalidContract(
          node.name,
          `${node.name} 第 ${index + 1} 行必须使用 key: value`
        );
      }
    }

    for (const { key } of node.fieldEntries) {
      if (!allowedKeys.has(key)) {
        return invalidContract(
          node.name,
          `${node.name} 包含未知字段 ${key}`
        );
      }
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      if (count > 1 && !repeatedKeys.has(key)) {
        return invalidContract(
          node.name,
          `${node.name} 字段 ${key} 不可重复`
        );
      }
    }

    for (const key of definition.required) {
      if (!node.fields[key]?.trim()) {
        return invalidContract(
          node.name,
          `${node.name} 缺少必填字段 ${key}`
        );
      }
    }

    for (const repeatedField of repeated ?? []) {
      const values = node.fieldEntries
        .filter(({ key }) => key === repeatedField.key)
        .map(({ value }) => value);
      if (values.length < repeatedField.minCount) {
        return invalidContract(
          node.name,
          `${node.name} 字段 ${repeatedField.key} 至少需要 ${repeatedField.minCount} 次`
        );
      }
      for (const [index, value] of values.entries()) {
        const columns = value.split("|").map((cell) => cell.trim());
        const requiredColumns = repeatedField.requiredColumns;
        const maxColumns = repeatedField.maxColumns;
        if (
          requiredColumns !== undefined &&
          maxColumns === requiredColumns &&
          columns.length !== requiredColumns
        ) {
          return invalidContract(
            node.name,
            `${node.name} 字段 ${repeatedField.key} 第 ${index + 1} 次必须是 ${requiredColumns} 列`
          );
        }
        if (
          requiredColumns !== undefined &&
          (columns.length < requiredColumns ||
            columns
              .slice(0, requiredColumns)
              .some((column) => !column.trim()))
        ) {
          return invalidContract(
            node.name,
            `${node.name} 字段 ${repeatedField.key} 第 ${index + 1} 次至少需要 ${requiredColumns} 个非空值`
          );
        }
        if (maxColumns !== undefined && columns.length > maxColumns) {
          return invalidContract(
            node.name,
            `${node.name} 字段 ${repeatedField.key} 第 ${index + 1} 次最多允许 ${maxColumns} 列`
          );
        }
      }
    }

    const constraints: FieldModuleDef["constraints"] =
      "constraints" in definition ? definition.constraints : undefined;
    for (const [key, maxChars] of Object.entries(
      constraints?.maxChars ?? {}
    )) {
      const value = node.fields[key];
      if (value && contentLength(value) > maxChars) {
        return invalidContract(
          node.name,
          `${node.name} 字段 ${key} 最多允许 ${maxChars} 个字符`
        );
      }
    }
    for (const [leftKey, rightKey] of constraints?.distinctFields ?? []) {
      const left = comparableFieldValue(node.fields[leftKey] ?? "");
      const right = comparableFieldValue(node.fields[rightKey] ?? "");
      if (left && right && left === right) {
        return invalidContract(
          node.name,
          `${node.name} 字段 ${leftKey} 与 ${rightKey} 不可重复`
        );
      }
    }

    return { ok: true };
  }

  if (definition.kind === "rows") {
    if (node.rows.length < definition.minRows) {
      return invalidContract(
        node.name,
        `${node.name} 至少需要 ${definition.minRows} 行`
      );
    }

    for (const [index, row] of node.rows.entries()) {
      if (row.length < definition.requiredColumns) {
        return invalidContract(
          node.name,
          `${node.name} 第 ${index + 1} 行至少需要 ${definition.requiredColumns} 列`
        );
      }
      if (row.length > definition.maxColumns) {
        return invalidContract(
          node.name,
          `${node.name} 第 ${index + 1} 行最多允许 ${definition.maxColumns} 列`
        );
      }
      if (
        row
          .slice(0, definition.requiredColumns)
          .some((value) => !value.trim())
      ) {
        return invalidContract(
          node.name,
          `${node.name} 第 ${index + 1} 行必填列不能为空`
        );
      }
    }

    return { ok: true };
  }

  if (definition.kind === "markdown-images") {
    const lines = node.body
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const imagePattern =
      /^!\[[^\]]*\]\([^\s)]+(?:\s+["'][^"']*["'])?\)$/;

    if (lines.some((line) => !imagePattern.test(line))) {
      return invalidContract(
        node.name,
        `${node.name} 只允许 Markdown 图片`
      );
    }
    if (lines.length < definition.minImages) {
      return invalidContract(
        node.name,
        `${node.name} 至少需要 ${definition.minImages} 张图片`
      );
    }
    const maxImages =
      "maxImages" in definition ? definition.maxImages : undefined;
    if (maxImages !== undefined && lines.length > maxImages) {
      return invalidContract(
        node.name,
        `${node.name} 最多允许 ${maxImages} 张图片`
      );
    }

    return { ok: true };
  }

  const lines = node.body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  for (const [index, line] of lines.entries()) {
    if (!/^[^:：]+[:：]\s*.+$/.test(line)) {
      return invalidContract(
        node.name,
        `${node.name} 第 ${index + 1} 行必须使用“角色: 内容”`
      );
    }
  }
  if (lines.length < definition.minLines) {
    return invalidContract(
      node.name,
      `${node.name} 至少需要 ${definition.minLines} 行对话`
    );
  }

  return { ok: true };
}

export function validateAdvancedModuleContracts(
  markdown: string
): AdvancedModuleContractValidation {
  for (const node of parseAdvancedMarkdown(markdown)) {
    if (node.type !== "module") continue;
    const validation = validateAdvancedModuleNode(node);
    if (!validation.ok) return validation;
  }

  return { ok: true };
}

export function advancedModuleToMarkdown(node: AdvancedModuleNode) {
  const parts: string[] = [];
  const seen = new Set<string>();
  const pushUnique = (value = "") => {
    const trimmed = value.trim();
    const comparable = comparableFieldValue(trimmed);
    if (!trimmed || !comparable || seen.has(comparable)) return;
    seen.add(comparable);
    parts.push(trimmed);
  };

  pushUnique(node.title);

  if (node.fieldEntries.length > 0) {
    for (const { value } of node.fieldEntries) pushUnique(value);
  } else if (node.rows.length > 0) {
    for (const row of node.rows) {
      pushUnique(row.filter(Boolean).join("："));
    }
  } else {
    pushUnique(node.body);
  }

  return parts.join("\n\n");
}
