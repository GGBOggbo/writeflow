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
  GenerateTitlesAndSummariesResult,
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
import { buildCoverImagePrompt } from "./prompts/cover-image";

type MeteredInput<T> = T & {
  operationId: string;
};

type ConfirmWorkflowId = (workflowId: string) => void;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function reportConfirmedWorkflowId(
  response: Response,
  onWorkflowId?: ConfirmWorkflowId
) {
  const confirmed = response.headers.get("X-Workflow-Id");
  if (confirmed && UUID_PATTERN.test(confirmed)) {
    onWorkflowId?.(confirmed);
  }
}

async function postJsonStream<TResponse>(
  url: string,
  workflowId: string,
  payload: unknown,
  validate: (data: unknown) => TResponse,
  onProgress?: (event: WorkflowProgressEvent) => void,
  onCredits?: (balance: CreditBalance) => void,
  onWorkflowId?: ConfirmWorkflowId
): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Workflow-Id": workflowId,
    },
    body: JSON.stringify(payload),
  });

  reportConfirmedWorkflowId(response, onWorkflowId);

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
  workflowId: string,
  input: MeteredInput<GenerateTopicsInput>,
  onProgress?: (event: WorkflowProgressEvent) => void,
  onCredits?: (balance: CreditBalance) => void,
  onWorkflowId?: ConfirmWorkflowId
): Promise<GenerateTopicsOutput> {
  return postJsonStream(
    "/api/ai/topics/stream",
    workflowId,
    input,
    (data) => topicResponseSchema.parse(data),
    onProgress,
    onCredits,
    onWorkflowId
  );
}

export function generateBrief(
  workflowId: string,
  input: MeteredInput<GenerateBriefInput>,
  onProgress?: (event: WorkflowProgressEvent) => void,
  onCredits?: (balance: CreditBalance) => void,
  onWorkflowId?: ConfirmWorkflowId
): Promise<GenerateBriefOutput> {
  return postJsonStream(
    "/api/ai/brief/stream",
    workflowId,
    input,
    (data) => briefResponseSchema.parse(data),
    onProgress,
    onCredits,
    onWorkflowId
  );
}

export function generateOutline(
  workflowId: string,
  input: MeteredInput<GenerateOutlineInput>,
  onProgress?: (event: WorkflowProgressEvent) => void,
  onCredits?: (balance: CreditBalance) => void,
  onWorkflowId?: ConfirmWorkflowId
): Promise<GenerateOutlineOutput> {
  return postJsonStream(
    "/api/ai/outline/stream",
    workflowId,
    input,
    (data) => outlineResponseSchema.parse(data),
    onProgress,
    onCredits,
    onWorkflowId
  );
}

export function generateDraft(
  workflowId: string,
  input: MeteredInput<GenerateDraftInput>,
  onProgress?: (event: WorkflowProgressEvent) => void,
  onCredits?: (balance: CreditBalance) => void,
  onWorkflowId?: ConfirmWorkflowId
): Promise<GenerateDraftOutput> {
  return postJsonStream(
    "/api/ai/draft/stream",
    workflowId,
    input,
    (data) => draftResponseSchema.parse(data),
    onProgress,
    onCredits,
    onWorkflowId
  );
}

export function humanizeDraft(
  workflowId: string,
  input: MeteredInput<HumanizeDraftInput>,
  onProgress?: (event: WorkflowProgressEvent) => void,
  onCredits?: (balance: CreditBalance) => void,
  onWorkflowId?: ConfirmWorkflowId
): Promise<HumanizeDraftOutput> {
  return postJsonStream(
    "/api/ai/humanize/stream",
    workflowId,
    input,
    (data) => humanizeDraftResponseSchema.parse(data),
    onProgress,
    onCredits,
    onWorkflowId
  );
}

export function generateTitlesAndSummaries(
  workflowId: string,
  input: MeteredInput<GenerateTitlesAndSummariesInput>,
  onProgress?: (event: WorkflowProgressEvent) => void,
  onCredits?: (balance: CreditBalance) => void,
  onWorkflowId?: ConfirmWorkflowId
): Promise<GenerateTitlesAndSummariesResult> {
  return postJsonStream(
    "/api/ai/meta/stream",
    workflowId,
    input,
    (data) => {
      const parsed = metaResponseSchema.parse(data);
      return { ...parsed, coverImagePrompt: buildCoverImagePrompt(parsed.coverImageConcept) };
    },
    onProgress,
    onCredits,
    onWorkflowId
  );
}
