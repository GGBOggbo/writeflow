import {
  ADVANCED_MODULE_NAMES,
  parseAdvancedMarkdown,
  validateAdvancedModuleContracts,
} from "@/lib/markdown/advanced-modules";

export type MarkdownPostProcessingValidation =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "empty"
        | "dangerous_html"
        | "placeholder_changed"
        | "module_changed"
        | "invalid_module_syntax"
        | "invalid_module_contract"
        | "insufficient_markdown_structure"
        | "content_loss";
      detail?: string;
    };

const MATERIAL_PLACEHOLDER_PATTERN = /【💡需要你补充：[^】]+】/g;
const HTML_TAG_PATTERN = /<\/?[a-z][^>]*>/i;
const MODULE_NAME_SET = new Set<string>(ADVANCED_MODULE_NAMES);

export type ProtectedMaterialPlaceholder = {
  token: string;
  value: string;
};

export function protectMaterialPlaceholders(content: string) {
  const placeholders: ProtectedMaterialPlaceholder[] = [];
  const protectedContent = content.replace(
    MATERIAL_PLACEHOLDER_PATTERN,
    (value) => {
      const token = `MATERIALSLOT${String(placeholders.length).padStart(3, "0")}DO_NOTEDIT`;
      placeholders.push({ token, value });
      return token;
    }
  );

  return { content: protectedContent, placeholders };
}

export function restoreMaterialPlaceholders(
  content: string,
  placeholders: ProtectedMaterialPlaceholder[]
) {
  let restored = content;

  for (const placeholder of placeholders) {
    const occurrences = restored.split(placeholder.token).length - 1;
    if (occurrences !== 1) {
      return null;
    }
    restored = restored.replace(placeholder.token, placeholder.value);
  }

  return restored;
}

function extractPlaceholders(content: string) {
  return content.match(MATERIAL_PLACEHOLDER_PATTERN) ?? [];
}

function comparableText(content: string) {
  return content
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^:::[^\n]*$/gm, "")
    .replace(/^\s*[a-zA-Z0-9_.-]+\s*:\s*/gm, "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*(?:[-+*]|\d+[.)])\s+/gm, "")
    .replace(/```[a-z0-9_-]*|```/gi, "")
    .replace(/[`*_~|]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .toLowerCase();
}

function ngrams(value: string, size = 2) {
  if (value.length <= size) {
    return new Set(value ? [value] : []);
  }

  const result = new Set<string>();
  for (let index = 0; index <= value.length - size; index += 1) {
    result.add(value.slice(index, index + size));
  }
  return result;
}

function advancedModuleSignature(content: string) {
  return parseAdvancedMarkdown(content)
    .filter((node) => node.type === "module")
    .map((node) => ({
      name: node.name,
      title: node.title ?? "",
      fieldKeys: node.fieldEntries.map(({ key }) => key),
      rowWidths: node.rows.map((row) => row.length),
      specialLines:
        node.fieldEntries.length === 0 && node.rows.length === 0
          ? node.body
              .split("\n")
              .map((line) =>
                /^!\[[^\]]*\]\([^)]+\)$/.test(line.trim())
                  ? "image"
                  : /^[^:：]+[:：]\s*.+$/.test(line.trim())
                    ? "dialogue"
                    : line.trim()
                      ? "text"
                      : "empty"
              )
          : [],
    }));
}

type AdvancedModuleSignature = ReturnType<typeof advancedModuleSignature>[number];

function preservesExistingModuleSignatures(
  source: AdvancedModuleSignature[],
  candidate: AdvancedModuleSignature[]
) {
  let candidateIndex = 0;

  for (const sourceSignature of source) {
    const serializedSource = JSON.stringify(sourceSignature);
    let matched = false;

    while (candidateIndex < candidate.length) {
      const candidateSignature = candidate[candidateIndex];
      candidateIndex += 1;
      if (JSON.stringify(candidateSignature) === serializedSource) {
        matched = true;
        break;
      }
    }

    if (!matched) return false;
  }

  return true;
}

function hasInvalidAdvancedModuleSyntax(content: string) {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  let activeModule = false;
  let codeFence: "`" | "~" | null = null;

  for (const line of lines) {
    const codeOpening = line.match(/^\s*(`{3,}|~{3,})/);
    if (codeOpening) {
      const fence = codeOpening[1][0] as "`" | "~";
      codeFence = codeFence === fence ? null : codeFence ?? fence;
      continue;
    }
    if (codeFence) continue;

    if (activeModule) {
      if (line.trim() === ":::") activeModule = false;
      continue;
    }

    if (line.trim() === ":::") return true;
    const opening = line.match(
      /^:::([a-z0-9-]+)(?:\[([^\]]*)\])?\s*$/i
    );
    if (!opening) continue;
    if (!MODULE_NAME_SET.has(opening[1])) return true;
    activeModule = true;
  }

  return activeModule;
}

function needsSectionHeadings(source: string) {
  const paragraphs = source
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  return comparableText(source).length >= 120 && paragraphs.length >= 5;
}

function hasSectionHeadingStructure(content: string) {
  if (/^\s{0,3}#{1,6}\s+\S/m.test(content)) return true;

  return parseAdvancedMarkdown(content).some(
    (node) =>
      node.type === "module" &&
      ["hero", "part", "label-title"].includes(node.name)
  );
}

function hasMeaningfulMarkdownStructure(source: string, candidate: string) {
  const hasModule = parseAdvancedMarkdown(candidate).some(
    (node) => node.type === "module"
  );
  const hasHeading = hasSectionHeadingStructure(candidate);
  if (needsSectionHeadings(source) && !hasHeading) return false;
  if (hasModule) return true;

  const hasRhythmMarker =
    /\*\*[^*\n]+\*\*/.test(candidate) ||
    /^\s*>\s+\S/m.test(candidate) ||
    /^\s*(?:[-+*]|\d+[.)])\s+\S/m.test(candidate) ||
    /^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/m.test(candidate);

  return hasHeading && hasRhythmMarker;
}

export function validateMarkdownPostProcessing(
  source: string,
  candidate: string
): MarkdownPostProcessingValidation {
  if (!candidate.trim()) {
    return { ok: false, reason: "empty" };
  }
  if (HTML_TAG_PATTERN.test(candidate)) {
    return { ok: false, reason: "dangerous_html" };
  }
  if (hasInvalidAdvancedModuleSyntax(candidate)) {
    return { ok: false, reason: "invalid_module_syntax" };
  }
  const sourcePlaceholders = extractPlaceholders(source);
  const candidatePlaceholders = extractPlaceholders(candidate);
  if (
    sourcePlaceholders.length !== candidatePlaceholders.length ||
    sourcePlaceholders.some(
      (placeholder, index) => candidatePlaceholders[index] !== placeholder
    )
  ) {
    return { ok: false, reason: "placeholder_changed" };
  }

  const sourceModules = advancedModuleSignature(source);
  if (
    sourceModules.length > 0 &&
    !preservesExistingModuleSignatures(
      sourceModules,
      advancedModuleSignature(candidate)
    )
  ) {
    return { ok: false, reason: "module_changed" };
  }
  const moduleContract = validateAdvancedModuleContracts(candidate);
  if (!moduleContract.ok) {
    return {
      ok: false,
      reason: "invalid_module_contract",
      detail: moduleContract.reason,
    };
  }

  const sourceText = comparableText(source);
  const candidateText = comparableText(candidate);
  const lengthRatio = candidateText.length / Math.max(sourceText.length, 1);
  const sourceNgrams = ngrams(sourceText);
  const candidateNgrams = ngrams(candidateText);
  const overlap = [...sourceNgrams].filter((gram) => candidateNgrams.has(gram)).length;
  const sourceCoverage = overlap / Math.max(sourceNgrams.size, 1);

  if (lengthRatio < 0.75 || lengthRatio > 1.65 || sourceCoverage < 0.78) {
    return { ok: false, reason: "content_loss" };
  }
  if (!hasMeaningfulMarkdownStructure(source, candidate)) {
    return { ok: false, reason: "insufficient_markdown_structure" };
  }

  return { ok: true };
}
