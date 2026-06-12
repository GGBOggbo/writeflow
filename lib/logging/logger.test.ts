import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { runWithLogContext } from "./context";
import { createAppLogger } from "./logger";

function captureLogger(level = "debug") {
  let output = "";
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      output += chunk.toString();
      callback();
    },
  });

  return {
    logger: createAppLogger({ level, destination }),
    records: () => output.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line)),
  };
}

describe("app logger", () => {
  it("injects request context into one-line JSON logs", async () => {
    const capture = captureLogger();

    await runWithLogContext(
      {
        requestId: "request-a",
        workflowId: "workflow-a",
        workflowIdSource: "client",
        operationId: "operation-a",
        stage: "topics",
      },
      async () => capture.logger.info({ event: "test.completed" }, "done")
    );

    expect(capture.records()).toEqual([
      expect.objectContaining({
        event: "test.completed",
        requestId: "request-a",
        workflowId: "workflow-a",
        operationId: "operation-a",
        stage: "topics",
        msg: "done",
      }),
    ]);
  });

  it("does not let one log payload mutate later request context logs", async () => {
    const capture = captureLogger();

    await runWithLogContext(
      {
        requestId: "request-a",
        workflowId: "workflow-a",
        workflowIdSource: "client",
        operationId: "operation-a",
        stage: "topics",
      },
      async () => {
        capture.logger.info({
          event: "search.plan.completed",
          plan: { coreTopic: "Claude" },
          raw: 20,
          selected: [{ rank: 1, title: "article" }],
        }, "plan completed");
        capture.logger.info({
          event: "search.article_info.completed",
          endpoint: "artinfo",
          htmlChars: 130652,
        }, "artinfo completed");
      }
    );

    const [, articleInfoRecord] = capture.records();
    expect(articleInfoRecord).toMatchObject({
      event: "search.article_info.completed",
      requestId: "request-a",
      workflowId: "workflow-a",
      operationId: "operation-a",
      stage: "topics",
      endpoint: "artinfo",
      htmlChars: 130652,
    });
    expect(articleInfoRecord).not.toHaveProperty("plan");
    expect(articleInfoRecord).not.toHaveProperty("raw");
    expect(articleInfoRecord).not.toHaveProperty("selected");
  });

  it("marks logs emitted outside request context", () => {
    const capture = captureLogger();
    capture.logger.info({ event: "test.outside" }, "outside");

    expect(capture.records()[0]).toMatchObject({ contextMissing: true });
  });

  it("redacts credentials and content payloads", () => {
    const capture = captureLogger();
    capture.logger.info({
      event: "test.redaction",
      apiKey: "fake-api-key",
      headers: { authorization: "Bearer fake-token", cookie: "session=fake" },
      body: { draftContent: "secret draft", comments: ["secret comment"] },
      prompt: { userPrompt: "secret prompt" },
    });

    const serialized = JSON.stringify(capture.records()[0]);
    expect(serialized).not.toContain("fake-api-key");
    expect(serialized).not.toContain("fake-token");
    expect(serialized).not.toContain("secret draft");
    expect(serialized).not.toContain("secret comment");
    expect(serialized).not.toContain("secret prompt");
  });

  it("filters records below the configured level", () => {
    const capture = captureLogger("info");
    capture.logger.debug({ event: "test.hidden" }, "hidden");
    capture.logger.info({ event: "test.visible" }, "visible");

    expect(capture.records()).toHaveLength(1);
    expect(capture.records()[0]).toMatchObject({ event: "test.visible" });
  });
});
