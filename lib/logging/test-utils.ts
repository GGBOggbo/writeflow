import { Writable } from "node:stream";
import { createAppLogger, replaceAppLoggerForTests } from "./logger";

export function capturePinoOutput(level = process.env.LOG_LEVEL ?? "debug") {
  let output = "";
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      output += chunk.toString();
      callback();
    },
  });
  const restoreLogger = replaceAppLoggerForTests(
    createAppLogger({ level, destination })
  );

  return {
    output: () => output,
    records: () =>
      output
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as Record<string, unknown>),
    restore: () => {
      restoreLogger();
    },
  };
}
