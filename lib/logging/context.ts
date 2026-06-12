import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import type { AiStage } from "@/lib/credits";

export type WorkflowIdSource = "client" | "generated";

export type LogContext = {
  requestId: string;
  workflowId: string;
  workflowIdSource: WorkflowIdSource;
  operationId?: string;
  stage?: AiStage;
  route?: string;
  userIdHash?: string;
  platformRequestId?: string;
};

const storage = new AsyncLocalStorage<LogContext>();

export function getLogContext() {
  return storage.getStore();
}

export function runWithLogContext<T>(
  context: LogContext,
  callback: () => T
): T {
  return storage.run({ ...context }, callback);
}

export function runWithExtendedLogContext<T>(
  extension: Partial<LogContext>,
  callback: () => T
): T {
  const current = getLogContext();
  if (!current) {
    return callback();
  }

  return storage.run({ ...current, ...extension }, callback);
}
