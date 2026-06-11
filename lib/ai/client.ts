import type {
  GenerateBriefInput,
  GenerateBriefOutput,
  GenerateDraftInput,
  GenerateDraftOutput,
  HumanizeDraftInput,
  HumanizeDraftOutput,
  GenerateOutlineInput,
  GenerateOutlineOutput,
  GenerateTitlesAndSummariesInput,
  GenerateTitlesAndSummariesOutput,
  GenerateTopicsInput,
  GenerateTopicsOutput,
} from "@/types/ai";
import type { WorkflowProgressEvent } from "@/lib/progress/types";
import type { CreditBalance } from "@/types/credits";
import {
  briefResponseSchema,
  draftResponseSchema,
  humanizeDraftResponseSchema,
  metaResponseSchema,
  outlineResponseSchema,
  topicResponseSchema,
} from "./schemas";

type MeteredInput<T> = T & {
  operationId: string;
};

async function postJsonStream<TResponse>(
  url: string,
  payload: unknown,
  validate: (data: unknown) => TResponse,
  onProgress?: (event: WorkflowProgressEvent) => void,
  onCredits?: (balance: CreditBalance) => void
): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.body) {
    const json = (await response.json().catch(() => null)) as unknown;
    const message =
      typeof json === "object" && json !== null && "error" in json
        ? String(json.error)
        : "请求失败";

    throw new Error(message);
  }

  if (response.headers.get("Content-Type")?.includes("application/json")) {
    return validate((await response.json()) as unknown);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: TResponse | null = null;

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const payload = JSON.parse(line) as
        | { type: "progress"; event: WorkflowProgressEvent }
        | { type: "credits"; balance: CreditBalance }
        | { type: "result"; data: unknown }
        | { type: "error"; error: string };

      if (payload.type === "progress") {
        onProgress?.(payload.event);
      } else if (payload.type === "credits") {
        onCredits?.(payload.balance);
      } else if (payload.type === "result") {
        result = validate(payload.data);
      } else if (payload.type === "error") {
        throw new Error(payload.error);
      }
    }

    if (done) break;
  }

  if (!result) {
    throw new Error("流式请求没有返回结果。");
  }

  return result;
}

export function generateTopics(
  input: MeteredInput<GenerateTopicsInput>,
  onProgress?: (event: WorkflowProgressEvent) => void,
  onCredits?: (balance: CreditBalance) => void
): Promise<GenerateTopicsOutput> {
  return postJsonStream(
    "/api/ai/topics/stream",
    input,
    (data) => topicResponseSchema.parse(data),
    onProgress,
    onCredits
  );
}

export function generateBrief(
  input: MeteredInput<GenerateBriefInput>,
  onProgress?: (event: WorkflowProgressEvent) => void,
  onCredits?: (balance: CreditBalance) => void
): Promise<GenerateBriefOutput> {
  return postJsonStream(
    "/api/ai/brief/stream",
    input,
    (data) => briefResponseSchema.parse(data),
    onProgress,
    onCredits
  );
}

export function generateOutline(
  input: MeteredInput<GenerateOutlineInput>,
  onProgress?: (event: WorkflowProgressEvent) => void,
  onCredits?: (balance: CreditBalance) => void
): Promise<GenerateOutlineOutput> {
  return postJsonStream(
    "/api/ai/outline/stream",
    input,
    (data) => outlineResponseSchema.parse(data),
    onProgress,
    onCredits
  );
}

export function generateDraft(
  input: MeteredInput<GenerateDraftInput>,
  onProgress?: (event: WorkflowProgressEvent) => void,
  onCredits?: (balance: CreditBalance) => void
): Promise<GenerateDraftOutput> {
  return postJsonStream(
    "/api/ai/draft/stream",
    input,
    (data) => draftResponseSchema.parse(data),
    onProgress,
    onCredits
  );
}

export function humanizeDraft(
  input: MeteredInput<HumanizeDraftInput>,
  onProgress?: (event: WorkflowProgressEvent) => void,
  onCredits?: (balance: CreditBalance) => void
): Promise<HumanizeDraftOutput> {
  return postJsonStream(
    "/api/ai/humanize/stream",
    input,
    (data) => humanizeDraftResponseSchema.parse(data),
    onProgress,
    onCredits
  );
}

export function generateTitlesAndSummaries(
  input: MeteredInput<GenerateTitlesAndSummariesInput>,
  onProgress?: (event: WorkflowProgressEvent) => void,
  onCredits?: (balance: CreditBalance) => void
): Promise<GenerateTitlesAndSummariesOutput> {
  return postJsonStream(
    "/api/ai/meta/stream",
    input,
    (data) => metaResponseSchema.parse(data),
    onProgress,
    onCredits
  );
}
