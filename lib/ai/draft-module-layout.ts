import type {
  AIProvider,
} from "./provider";
import {
  parseAdvancedMarkdown,
  type AdvancedModuleName,
} from "@/lib/markdown/advanced-modules";
import { validateMarkdownPostProcessing } from "./markdown-post-processing";

export type DraftModuleLayoutSource = "ai" | "ai_retry" | "local_fallback";

export type DraftModuleLayoutResult = {
  content: string;
  source: DraftModuleLayoutSource;
  attempts: number;
  failures: string[];
  moduleCount: number;
  moduleNames: AdvancedModuleName[];
  ctaCount: number;
  degradedModules: number;
  degradationReasons: string[];
};

type DraftFormatter = AIProvider["formatDraftMarkdown"];

function splitHeadingLead(paragraph: string) {
  const punctuationIndex = paragraph.search(/[。！？!?；;]/);
  const boundary =
    punctuationIndex >= 0 && punctuationIndex < 36
      ? punctuationIndex + 1
      : Math.min(Array.from(paragraph).length, 28);
  const characters = Array.from(paragraph);

  return {
    lead: characters.slice(0, boundary).join(""),
    remainder: characters.slice(boundary).join(""),
  };
}

function stripMarkdownMarkers(content: string) {
  return content
    .trim()
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/[*_`~]/g, "")
    .trim();
}

function moduleStats(content: string) {
  const names = parseAdvancedMarkdown(content)
    .filter((node) => node.type === "module")
    .map((node) => node.name);

  return {
    moduleCount: names.length,
    moduleNames: [...new Set(names)],
    ctaCount: names.filter((name) => name === "cta").length,
  };
}

type ProtectedAdvancedModule = {
  token: string;
  value: string;
};

function protectAdvancedModules(content: string) {
  const lines = content.split("\n");
  const modules: ProtectedAdvancedModule[] = [];
  const output: string[] = [];
  let codeFence: "`" | "~" | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const codeOpening = line.match(/^\s*(`{3,}|~{3,})/);
    if (codeOpening) {
      const fence = codeOpening[1][0] as "`" | "~";
      codeFence = codeFence === fence ? null : codeFence ?? fence;
      output.push(line);
      continue;
    }

    if (codeFence || !/^:::[a-z0-9-]+(?:\[[^\]]*])?\s*$/i.test(line)) {
      output.push(line);
      continue;
    }

    let closingIndex = -1;
    for (let candidateIndex = index + 1; candidateIndex < lines.length; candidateIndex += 1) {
      if (lines[candidateIndex]?.trim() === ":::") {
        closingIndex = candidateIndex;
        break;
      }
    }
    if (closingIndex < 0) {
      output.push(line);
      continue;
    }

    const token = `ADVANCEDMODULE${String(modules.length).padStart(3, "0")}DO_NOTEDIT`;
    modules.push({
      token,
      value: lines.slice(index, closingIndex + 1).join("\n"),
    });
    output.push(token);
    index = closingIndex;
  }

  return { content: output.join("\n"), modules };
}

function restoreAdvancedModules(
  content: string,
  modules: ProtectedAdvancedModule[]
) {
  return modules.reduce(
    (restored, module) => restored.replace(module.token, module.value),
    content
  );
}

function isProtectedPlaceholder(paragraph: string) {
  return /(?:MATERIALSLOT|ADVANCEDMODULE)\d{3}DO_NOTEDIT|【💡需要你补充：[^】]+】/.test(paragraph);
}

function isMarkdownBlock(paragraph: string) {
  const trimmed = paragraph.trim();
  return (
    /^:::[a-z0-9-]+(?:\[[^\]]*])?\s*$/i.test(trimmed) ||
    /^#{1,6}\s+\S/.test(trimmed) ||
    /^>\s+\S/.test(trimmed) ||
    /^[-+*]\s+\S/.test(trimmed) ||
    /^\d+[.)]\s+\S/.test(trimmed)
  );
}

function looksLikePlainHeadingText(text: string) {
  const length = Array.from(text).length;
  return Boolean(text) && length >= 5 && length <= 30 && !/[。；;]$/.test(text);
}

function looksLikeStandaloneHeading(
  paragraph: string,
  nextParagraph?: string,
  previousParagraph?: string
) {
  const text = stripMarkdownMarkers(paragraph);
  if (!text || isProtectedPlaceholder(paragraph) || isMarkdownBlock(paragraph)) {
    return false;
  }
  if (text.includes("\n") || !looksLikePlainHeadingText(text)) return false;
  if (!nextParagraph?.trim()) return false;

  const previousText = previousParagraph
    ? stripMarkdownMarkers(previousParagraph)
    : "";
  if (/[？?]$/.test(text) && looksLikePlainHeadingText(previousText)) {
    return false;
  }

  return true;
}

function addFallbackEmphasis(paragraphs: string[]) {
  if (paragraphs.some((paragraph) => /\*\*[^*\n]+\*\*/.test(paragraph))) {
    return true;
  }

  const targetIndex = paragraphs.findIndex((paragraph) => {
    const trimmed = paragraph.trim();
    return (
      trimmed &&
      !trimmed.startsWith("## ") &&
      !isMarkdownBlock(trimmed) &&
      !isProtectedPlaceholder(trimmed)
    );
  });
  if (targetIndex < 0) return false;

  const paragraph = paragraphs[targetIndex]?.trim() ?? "";
  paragraphs[targetIndex] = `**${paragraph}**`;
  return true;
}

function emphasizeFallbackHeading(paragraphs: string[]) {
  const targetIndex = paragraphs.findIndex((paragraph) =>
    paragraph.trim().startsWith("## ")
  );
  if (targetIndex < 0) return;

  const heading = paragraphs[targetIndex]?.trim() ?? "";
  if (/^##\s+\*\*[^*\n]+\*\*$/.test(heading)) return;
  paragraphs[targetIndex] = heading.replace(/^##\s+(.+)$/, "## **$1**");
}

function hasPromotableStandaloneHeading(paragraphs: string[]) {
  return paragraphs.some((paragraph, index) =>
    looksLikeStandaloneHeading(
      paragraph,
      paragraphs[index + 1],
      paragraphs[index - 1]
    )
  );
}

function demoteConsecutiveQuestionHeadings(paragraphs: string[]) {
  for (let index = 1; index < paragraphs.length; index += 1) {
    const previous = paragraphs[index - 1]?.trim() ?? "";
    const current = paragraphs[index]?.trim() ?? "";
    if (/^##\s+\S/.test(previous) && /^##\s+.+[？?]$/.test(current)) {
      paragraphs[index] = current.replace(/^##\s+/, "");
    }
  }
}

export function buildBasicMarkdownFallback(content: string) {
  const normalized = content.replace(/\r\n?/g, "\n").trim();
  const protectedModules = protectAdvancedModules(normalized);
  const paragraphs = protectedModules.content.split(/\n\s*\n/);
  const existingValidation = validateMarkdownPostProcessing(
    normalized,
    normalized
  );
  const needsValidFallback = !existingValidation.ok;
  if (!needsValidFallback && !hasPromotableStandaloneHeading(paragraphs)) {
    return normalized;
  }

  const headingIndex = paragraphs.findIndex(
    (paragraph) =>
      paragraph.trim() &&
      !paragraph.includes("【💡需要你补充：") &&
      !paragraph.trim().startsWith(":::")
  );
  if (needsValidFallback && headingIndex < 0) {
    return restoreAdvancedModules(
      `## **${protectedModules.content}**`,
      protectedModules.modules
    );
  }

  for (let index = 0; index < paragraphs.length; index += 1) {
    const paragraph = paragraphs[index]?.trim() ?? "";
    const nextParagraph = paragraphs[index + 1];
    const previousParagraph = paragraphs[index - 1];
    if (
      (needsValidFallback && index === headingIndex) ||
      looksLikeStandaloneHeading(paragraph, nextParagraph, previousParagraph)
    ) {
      const { lead, remainder } = splitHeadingLead(paragraph);
      paragraphs[index] = remainder
        ? `## ${lead}\n\n**${remainder}**`
        : `## ${lead}`;
    }
  }

  if (needsValidFallback) {
    if (!addFallbackEmphasis(paragraphs)) {
      emphasizeFallbackHeading(paragraphs);
    }
  }
  demoteConsecutiveQuestionHeadings(paragraphs);

  return restoreAdvancedModules(
    paragraphs.join("\n\n"),
    protectedModules.modules
  );
}

export async function layoutDraftModules(
  content: string,
  formatDraftMarkdown: DraftFormatter
): Promise<DraftModuleLayoutResult> {
  const formatted = await formatDraftMarkdown(content);
  const stats = moduleStats(formatted);

  return {
    content: formatted,
    source: "ai",
    attempts: 1,
    failures: [],
    ...stats,
    degradedModules: 0,
    degradationReasons: [],
  };
}
