import "server-only";
import type { Writable } from "node:stream";
import pino from "pino";
import { getLogContext } from "./context";

type AppLoggerOptions = {
  level?: string;
  destination?: Writable;
};

const REDACT_PATHS = [
  "authorization",
  "cookie",
  "set-cookie",
  "password",
  "secret",
  "token",
  "apiKey",
  "headers.authorization",
  "headers.cookie",
  "request.headers.authorization",
  "request.headers.cookie",
  "body.draftContent",
  "body.articleHtml",
  "body.comments",
  "prompt.systemPrompt",
  "prompt.userPrompt",
  "response.content",
];

function currentLevel() {
  const raw = process.env.LOG_LEVEL?.trim().toLowerCase();
  return raw && ["fatal", "error", "warn", "info", "debug", "trace", "silent"].includes(raw)
    ? raw
    : "error";
}

function baseOptions(level: string): pino.LoggerOptions {
  return {
    level,
    base: {
      service: "wechat-writing-workflow",
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    },
    redact: {
      paths: REDACT_PATHS,
      censor: "[Redacted]",
    },
    mixin() {
      const context = getLogContext();
      return context ? context : { contextMissing: true };
    },
  };
}

export function createAppLogger(options: AppLoggerOptions = {}) {
  const level = options.level ?? currentLevel();
  if (options.destination) {
    return pino(baseOptions(level), options.destination);
  }

  if (process.env.LOG_FORMAT !== "json" && process.env.NODE_ENV === "development") {
    try {
      return pino({
        ...baseOptions(level),
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            singleLine: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      });
    } catch {
      return pino(baseOptions(level));
    }
  }

  return pino(baseOptions(level));
}

export type AppLogger = ReturnType<typeof createAppLogger>;

export const appLogger = createAppLogger();
const LOGGER_STATE_KEY = Symbol.for("wechat-writing-workflow.logger-state");

type LoggerState = {
  activeLogger: AppLogger;
};

const loggerState = ((globalThis as typeof globalThis & {
  [LOGGER_STATE_KEY]?: LoggerState;
})[LOGGER_STATE_KEY] ??= { activeLogger: appLogger });

export function getAppLogger() {
  return loggerState.activeLogger;
}

export function replaceAppLoggerForTests(logger: AppLogger) {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("replaceAppLoggerForTests can only be used in tests.");
  }

  const previous = loggerState.activeLogger;
  loggerState.activeLogger = logger;
  return () => {
    loggerState.activeLogger = previous;
  };
}
