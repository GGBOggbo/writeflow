import "server-only";
import { getAppLogger } from "@/lib/logging/logger";

function safeError(error: unknown) {
  if (error instanceof Error) {
    return {
      errorType: error.name,
      errorMessage: error.message,
    };
  }

  return {
    errorType: typeof error,
    errorMessage: String(error ?? ""),
  };
}

function asLogObject(scope: string, details?: Record<string, unknown>) {
  return { scope, ...(details ?? {}) };
}

function currentLevel() {
  const raw = process.env.LOG_LEVEL?.trim().toLowerCase();
  return raw && ["fatal", "error", "warn", "info", "debug", "trace", "silent"].includes(raw)
    ? raw
    : "error";
}

function syncLevel() {
  getAppLogger().level = currentLevel();
}

export const log = {
  /** Log an error — always visible (default level). */
  error(scope: string, tagOrError: string | unknown, error?: unknown) {
    try {
      syncLevel();
      const appLogger = getAppLogger();
      if (typeof tagOrError === "string") {
        appLogger.error(asLogObject(scope, safeError(error)), tagOrError);
      } else {
        const safe = safeError(tagOrError);
        appLogger.error(asLogObject(scope, safe), safe.errorMessage);
      }
    } catch {
      // Logging must never break the business flow.
    }
  },

  /** Log a warning — e.g. degraded pipeline, quality alerts. */
  warn(scope: string, message: string, details?: Record<string, unknown>) {
    try {
      syncLevel();
      const appLogger = getAppLogger();
      appLogger.warn(asLogObject(scope, details), message);
    } catch {
      // Logging must never break the business flow.
    }
  },

  /** Log a one-liner info — request sent, result summary, timing. */
  info(scope: string, message: string, details?: Record<string, unknown>) {
    try {
      syncLevel();
      const appLogger = getAppLogger();
      appLogger.info(asLogObject(scope, details), message);
    } catch {
      // Logging must never break the business flow.
    }
  },

  /** Log verbose details — raw payloads, response dumps, etc. */
  debug(scope: string, message: string, data?: unknown) {
    try {
      syncLevel();
      const appLogger = getAppLogger();
      appLogger.debug(
        asLogObject(
          scope,
          data && typeof data === "object" && !Array.isArray(data)
            ? (data as Record<string, unknown>)
            : { data }
        ),
        message
      );
    } catch {
      // Logging must never break the business flow.
    }
  },
} as const;
