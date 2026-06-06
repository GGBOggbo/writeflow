/**
 * Unified toggleable logger for the entire application.
 *
 * Set `LOG_LEVEL` in `.env.local` to control verbosity:
 *
 *   LOG_LEVEL=error   — only errors (default if unset)
 *   LOG_LEVEL=warn    — errors + warnings
 *   LOG_LEVEL=info    — errors + warnings + request/result summaries
 *   LOG_LEVEL=debug   — all of the above + detailed payload dumps
 *
 * Omit the variable (or set anything else) to get `error` level.
 *
 * Usage:
 *   import { log } from "@/lib/debug";
 *   log.info("topics", "请求发送", { query: "..." });
 *   log.error("topics", err);
 */

type LogLevel = "error" | "warn" | "info" | "debug";

const LEVEL_RANK: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

function currentLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL?.trim().toLowerCase();
  if (raw && raw in LEVEL_RANK) return raw as LogLevel;
  return "error";
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_RANK[level] <= LEVEL_RANK[currentLevel()];
}

export const log = {
  /** Log an error — always visible (default level). */
  error(scope: string, tagOrError: string | unknown, error?: unknown) {
    if (!shouldLog("error")) return;
    if (typeof tagOrError === "string") {
      const message = error instanceof Error ? error.message : String(error ?? "");
      console.error(`[${scope}] ✗ ${tagOrError} | ${message}`);
    } else {
      const message = tagOrError instanceof Error ? tagOrError.message : String(tagOrError);
      console.error(`[${scope}] ✗ ${message}`);
    }
  },

  /** Log a warning — e.g. degraded pipeline, quality alerts. */
  warn(scope: string, message: string, details?: Record<string, unknown>) {
    if (!shouldLog("warn")) return;
    const suffix = details ? ` | ${JSON.stringify(details)}` : "";
    console.warn(`[${scope}] ⚠ ${message}${suffix}`);
  },

  /** Log a one-liner info — request sent, result summary, timing. */
  info(scope: string, message: string, details?: Record<string, unknown>) {
    if (!shouldLog("info")) return;
    const suffix = details ? ` | ${JSON.stringify(details)}` : "";
    console.log(`[${scope}] → ${message}${suffix}`);
  },

  /** Log verbose details — raw payloads, response dumps, etc. */
  debug(scope: string, message: string, data?: unknown) {
    if (!shouldLog("debug")) return;
    if (data !== undefined) {
      console.log(`[${scope}] … ${message}`, JSON.stringify(data, null, 2));
    } else {
      console.log(`[${scope}] … ${message}`);
    }
  },
} as const;
