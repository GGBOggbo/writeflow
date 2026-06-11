import {
  briefResponseSchema,
  draftResponseSchema,
  humanizedDraftResponseSchema,
  metaResponseSchema,
  outlineResponseSchema,
  topicResponseSchema,
  benchmarkSummaryResponseSchema,
} from "./schemas";
import { log } from "@/lib/debug";
import { buildBriefPrompt } from "./prompts/brief";
import { buildDraftPrompt } from "./prompts/draft";
import { buildHumanizeDraftPrompt } from "./prompts/humanize-draft";
import { buildMetaPrompt } from "./prompts/meta";
import { buildOutlinePrompt } from "./prompts/outline";
import { buildTopicsPrompt } from "./prompts/topics";
import { buildBenchmarkSummaryPrompt } from "./prompts/benchmark-summary";
import { assertProviderKey, getRealProviderConfig } from "./provider-config";
import type { AIProvider, RealAIProviderName } from "./provider";
import { parseJsonCandidates } from "./parse-json";

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

export function createRealAIProvider(name: RealAIProviderName): AIProvider {
  const config = getRealProviderConfig(name);
  assertProviderKey(config);

  if (config.name !== "mimo" && config.name !== "deepseek") {
    // Only mimo and deepseek are fully implemented; return a provider that throws on every call.
    return {
      async generateTopics() {
        assertProviderKey(config);
        throw notImplemented(config.name, "topics");
      },
      async summarizeBenchmarks() {
        assertProviderKey(config);
        throw notImplemented(config.name, "benchmark summary");
      },
      async generateBrief() {
        assertProviderKey(config);
        throw notImplemented(config.name, "brief");
      },
      async generateOutline() {
        assertProviderKey(config);
        throw notImplemented(config.name, "outline");
      },
      async generateDraft() {
        assertProviderKey(config);
        throw notImplemented(config.name, "draft");
      },
      async humanizeDrafts() {
        assertProviderKey(config);
        throw notImplemented(config.name, "draft humanization");
      },
      async generateTitlesAndSummaries() {
        assertProviderKey(config);
        throw notImplemented(config.name, "meta");
      },
    };
  }

  // DeepSeek uses the same OpenAI-compatible API as Mimo.
  const defaultModel =
    config.name === "deepseek" ? "deepseek-v4-flash" : "mimo-v2.5-pro";
  const defaultBaseUrl =
    config.name === "deepseek"
      ? "https://api.deepseek.com/v1"
      : "https://token-plan-cn.xiaomimimo.com/v1";
  const providerLabel = config.name;

  const defaults = { model: defaultModel, baseUrl: defaultBaseUrl, label: providerLabel };

  return {
    summarizeBenchmarks: (results) =>
      callMimo(results, config, defaults, {
        buildPrompt: buildBenchmarkSummaryPrompt,
        jsonHint:
          '{"summaries":[{"url":"string","userPain":"string","structurePattern":"string","rhythmNotes":"string","commentInsights":["string"],"reusableAngles":["string"],"avoidCopying":["string"]}]}',
        maxTokens: 1600,
        temperature: 0.25,
        schema: benchmarkSummaryResponseSchema,
        label: `${providerLabel} benchmark summary`,
        retries: 2,
      }),

    generateTopics: (input) =>
      callMimo(input, config, defaults, {
        buildPrompt: buildTopicsPrompt,
        jsonHint:
          '{"topics":[{"id":"string","title":"string","label":"string","angle":"string","summary":"string","coreViewpoint":"string","targetAudience":"string","reason":"string"}]}',
        maxTokens: 4096,
        schema: topicResponseSchema,
        label: `${providerLabel} topics`,
      }),

    generateBrief: (input) =>
      callMimo(input, config, defaults, {
        buildPrompt: buildBriefPrompt,
        jsonHint:
          '{"brief":{"objective":"string","audience":"string","persona":"string","tone":"string","dropOffPoint":"string","constraints":["string"]}}',
        maxTokens: 1024,
        schema: briefResponseSchema,
        label: `${providerLabel} brief`,
        retries: 2,
      }),

    generateOutline: (input) =>
      callMimo(input, config, defaults, {
        buildPrompt: buildOutlinePrompt,
        jsonHint:
          '{"outline":[{"id":"string","heading":"string","corePoint":"string","supportSuggestion":"string","sectionRole":"string"}],"materialSlots":[{"id":"string","targetOutlineId":"string","label":"string","content":"string","purpose":"string"}]}',
        maxTokens: 2200,
        temperature: 0.35,
        schema: outlineResponseSchema,
        label: `${providerLabel} outline`,
        retries: 3,
        postParse: normalizeOutlinePayload,
      }),

    generateDraft: (input) =>
      callMimo(input, config, defaults, {
        buildPrompt: buildDraftPrompt,
        jsonHint:
          '{"drafts":[{"id":"string","label":"string","content":"string"}]}',
        maxTokens: 2200,
        temperature: 0.75,
        schema: draftResponseSchema,
        label: `${providerLabel} draft`,
        retries: 2,
        postParse: normalizeDraftPayload,
      }),

    humanizeDrafts: (input) =>
      callMimo(input, config, defaults, {
        buildPrompt: buildHumanizeDraftPrompt,
        jsonHint:
          '{"drafts":[{"id":"string","label":"string","content":"string"}]}',
        maxTokens: 2400,
        temperature: 0.65,
        schema: humanizedDraftResponseSchema,
        label: `${providerLabel} draft humanizer`,
        retries: 1,
        postParse: normalizeDraftPayload,
      }),

    generateTitlesAndSummaries: (input) =>
      callMimo(input, config, defaults, {
        buildPrompt: buildMetaPrompt,
        jsonHint:
          '{"titles":[{"id":"string","label":"利益结果型","content":"string"},{"id":"string","label":"场景痛点型","content":"string"},{"id":"string","label":"反常识/认知冲突型","content":"string"},{"id":"string","label":"新机会趋势型","content":"string"},{"id":"string","label":"个人故事/实录型","content":"string"}],"summaries":[{"id":"string","label":"痛点共鸣版","content":"string"},{"id":"string","label":"悬念反转版","content":"string"},{"id":"string","label":"专业克制版","content":"string"}],"coverSuggestion":"string"}',
        maxTokens: 1200,
        temperature: 0.75,
        schema: metaResponseSchema,
        label: `${providerLabel} meta`,
      }),
  };
}

// ---------------------------------------------------------------------------
// Generic Mimo call helper
// ---------------------------------------------------------------------------

type MimoCallSpec<TInput, TOutput> = {
  buildPrompt: (input: TInput) => { systemPrompt: string; userPrompt: string };
  jsonHint: string;
  maxTokens: number;
  temperature?: number;
  schema: { parse: (data: unknown) => TOutput };
  label: string;
  retries?: number;
  /** Optional transform before schema validation (e.g. normalise draft shape). */
  postParse?: (parsed: unknown) => unknown;
};

async function callMimo<TInput, TOutput>(
  input: TInput,
  config: ReturnType<typeof getRealProviderConfig>,
  defaults: { model: string; baseUrl: string; label: string },
  spec: MimoCallSpec<TInput, TOutput>,
): Promise<TOutput> {
  const prompt = spec.buildPrompt(input);
  const model = config.model?.trim() || defaults.model;
  const baseUrl = config.baseUrl?.trim() || defaults.baseUrl;

  const maxAttempts = spec.retries ?? 1;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    log.info("ai", `→ ${spec.label} | attempt=${attempt + 1}/${maxAttempts} model=${model} maxTokens=${spec.maxTokens}`);
    log.debug("ai", `${spec.label} userPrompt`, prompt.userPrompt);
    const t0 = Date.now();

    const response = await postMimoChatCompletion(baseUrl, config.apiKey, {
      model,
      messages: [
        {
          role: "system",
          content: `${prompt.systemPrompt}\n你必须只返回 JSON，不要输出解释、标题或 Markdown 代码块。`,
        },
        {
          role: "user",
          content: `${prompt.userPrompt}\n请严格返回这个 JSON 结构：${spec.jsonHint}`,
        },
      ],
      stream: false,
      temperature: spec.temperature ?? 0.7,
      top_p: 0.95,
      max_completion_tokens: spec.maxTokens,
      thinking: { type: "disabled" },
    });

    const json = (await response.json()) as MimoChatCompletionResponse;

    if (!response.ok) {
      const errMsg = json?.error?.message || `${spec.label} 请求失败（${response.status}）`;
      log.error("ai", spec.label, new Error(errMsg));
      throw new Error(errMsg);
    }

    const content = json.choices?.[0]?.message?.content;

    if (!content) {
      const err = new Error(`${spec.label} 返回为空。`);
      log.warn("ai", `${spec.label} 返回为空，${Date.now() - t0}ms`);
      if (maxAttempts <= 1) throw err;
      lastError = err;
      continue;
    }

    try {
      const candidates = parseJsonCandidates(content);

      if (candidates.length === 0) {
        throw new Error(`${spec.label} 返回内容不是合法 JSON。`);
      }

      let lastSchemaError: unknown;

      for (const candidate of candidates) {
        try {
          const transformed = spec.postParse ? spec.postParse(candidate) : candidate;
          const result = spec.schema.parse(transformed);
          log.info("ai", `← ${spec.label} | OK ${Date.now() - t0}ms`);
          log.debug("ai", `${spec.label} 返回内容预览`, content.slice(0, 300));
          return result;
        } catch (error) {
          lastSchemaError = error;
        }
      }

      throw lastSchemaError instanceof Error
        ? lastSchemaError
        : new Error(`${spec.label} 返回内容格式不符合预期。`);
    } catch (error) {
      if (maxAttempts <= 1) {
        log.error("ai", `${spec.label} 失败`, error);
        throw error;
      }
      log.warn("ai", `${spec.label} 解析失败，准备重试`, { attempt: attempt + 1, preview: content.slice(0, 200) });
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`${spec.label} 请求失败。`);
}

// ---------------------------------------------------------------------------
// Mimo HTTP layer
// ---------------------------------------------------------------------------

type MimoChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

type MimoRequestPayload = {
  model: string;
  messages: Array<{
    role: "system" | "user";
    content: string;
  }>;
  stream: false;
  temperature: number;
  top_p: number;
  max_completion_tokens: number;
  thinking: { type: "disabled" };
};

async function postMimoChatCompletion(
  baseUrl: string,
  apiKey: string | undefined,
  payload: MimoRequestPayload,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("fetch failed");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function notImplemented(provider: string, step: string): Error {
  return new Error(
    `${provider} provider 已配置，但 ${step} 真实调用尚未实现。`,
  );
}

/**
 * Mimo sometimes returns a single draft object `{ id, label, content }`
 * instead of the expected `{ drafts: [...] }` wrapper. This normaliser
 * detects that shape and wraps it so the Zod schema can validate cleanly.
 */
function normalizeDraftPayload(parsed: unknown): unknown {
  if (
    parsed &&
    typeof parsed === "object" &&
    !Array.isArray(parsed) &&
    "id" in parsed &&
    "label" in parsed &&
    "content" in parsed &&
    !("drafts" in parsed)
  ) {
    return { drafts: [parsed] };
  }

  return parsed;
}

function normalizeOutlinePayload(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return parsed;
  }

  const record = parsed as Record<string, unknown>;
  const normalizedOutline =
    record.outline ??
    record.sections ??
    (record.id && record.heading ? [record] : undefined);
  const normalizedMaterialSlots =
    record.materialSlots ??
    record.slots ??
    (record.label && record.content ? [record] : undefined);

  if (normalizedOutline || normalizedMaterialSlots) {
    return {
      ...record,
      outline: Array.isArray(normalizedOutline)
        ? normalizedOutline
        : normalizedOutline
          ? [normalizedOutline]
          : [],
      materialSlots: Array.isArray(normalizedMaterialSlots)
        ? normalizedMaterialSlots
        : normalizedMaterialSlots
          ? [normalizedMaterialSlots]
          : [],
    };
  }

  return parsed;
}
