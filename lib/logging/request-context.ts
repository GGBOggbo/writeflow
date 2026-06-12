import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { getAppLogger } from "./logger";
import {
  getLogContext,
  runWithLogContext,
  type LogContext,
} from "./context";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let warnedMissingHashSecret = false;

function validUuid(value: string | null) {
  return value ? UUID_PATTERN.test(value) : false;
}

export function buildRequestLogContext(request: Request): LogContext {
  const url = new URL(request.url);
  const workflowHeader = request.headers.get("x-workflow-id");
  const workflowIdSource = validUuid(workflowHeader) ? "client" : "generated";

  return {
    requestId: randomUUID(),
    workflowId: workflowIdSource === "client" ? workflowHeader! : randomUUID(),
    workflowIdSource,
    route: url.pathname,
    platformRequestId: request.headers.get("x-vercel-id") ?? undefined,
  };
}

export async function hashUserId(userId: string) {
  const secret = process.env.LOG_HASH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production" && !warnedMissingHashSecret) {
      warnedMissingHashSecret = true;
      getAppLogger().warn(
        { event: "logging.user_hash_secret_missing", scope: "logging" },
        "LOG_HASH_SECRET is missing; omitting userIdHash"
      );
    }
    return undefined;
  }

  return createHmac("sha256", secret).update(userId).digest("hex").slice(0, 16);
}

export function withRequestLogContext<T>(
  request: Request,
  callback: (context: LogContext) => T
): T {
  const context = buildRequestLogContext(request);
  return runWithLogContext(context, () => callback(context));
}

export function logResponseHeaders(context: LogContext | undefined = getLogContext()) {
  return {
    "X-Request-Id": context?.requestId ?? randomUUID(),
    "X-Workflow-Id": context?.workflowId ?? randomUUID(),
  };
}
