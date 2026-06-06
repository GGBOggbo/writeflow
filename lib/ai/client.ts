import type {
  GenerateBriefInput,
  GenerateBriefOutput,
  GenerateDraftInput,
  GenerateDraftOutput,
  GenerateOutlineInput,
  GenerateOutlineOutput,
  GenerateTitlesAndSummariesInput,
  GenerateTitlesAndSummariesOutput,
  GenerateTopicsInput,
  GenerateTopicsOutput,
} from "@/types/ai";
import type { WorkflowProgressEvent } from "@/lib/progress/types";
import {
  briefResponseSchema,
  draftResponseSchema,
  metaResponseSchema,
  outlineResponseSchema,
  topicResponseSchema,
} from "./schemas";

async function postJsonStream<TResponse>(
  url: string,
  payload: unknown,
  validate: (data: unknown) => TResponse,
  onProgress?: (event: WorkflowProgressEvent) => void
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
        | { type: "result"; data: unknown }
        | { type: "error"; error: string };

      if (payload.type === "progress") {
        onProgress?.(payload.event);
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
  input: GenerateTopicsInput,
  onProgress?: (event: WorkflowProgressEvent) => void
): Promise<GenerateTopicsOutput> {
  return postJsonStream(
    "/api/ai/topics/stream",
    input,
    (data) => topicResponseSchema.parse(data),
    onProgress
  );
}

export function generateBrief(
  input: GenerateBriefInput,
  onProgress?: (event: WorkflowProgressEvent) => void
): Promise<GenerateBriefOutput> {
  return postJsonStream(
    "/api/ai/brief/stream",
    input,
    (data) => briefResponseSchema.parse(data),
    onProgress
  );
}

export function generateOutline(
  input: GenerateOutlineInput,
  onProgress?: (event: WorkflowProgressEvent) => void
): Promise<GenerateOutlineOutput> {
  return postJsonStream(
    "/api/ai/outline/stream",
    input,
    (data) => outlineResponseSchema.parse(data),
    onProgress
  );
}

export function generateDraft(
  input: GenerateDraftInput,
  onProgress?: (event: WorkflowProgressEvent) => void
): Promise<GenerateDraftOutput> {
  return postJsonStream(
    "/api/ai/draft/stream",
    input,
    (data) => draftResponseSchema.parse(data),
    onProgress
  );
}

export function generateTitlesAndSummaries(
  input: GenerateTitlesAndSummariesInput,
  onProgress?: (event: WorkflowProgressEvent) => void
): Promise<GenerateTitlesAndSummariesOutput> {
  return postJsonStream(
    "/api/ai/meta/stream",
    input,
    (data) => metaResponseSchema.parse(data),
    onProgress
  );
}
