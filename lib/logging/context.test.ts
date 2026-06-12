import { describe, expect, it } from "vitest";
import {
  getLogContext,
  runWithExtendedLogContext,
  runWithLogContext,
} from "./context";

describe("logging context", () => {
  it("keeps context across async work", async () => {
    const context = await runWithLogContext(
      {
        requestId: "request-a",
        workflowId: "workflow-a",
        workflowIdSource: "client",
      },
      async () => {
        await Promise.resolve();
        return getLogContext();
      }
    );

    expect(context).toMatchObject({
      requestId: "request-a",
      workflowId: "workflow-a",
    });
  });

  it("isolates concurrent requests", async () => {
    const [left, right] = await Promise.all([
      runWithLogContext(
        {
          requestId: "request-left",
          workflowId: "workflow-left",
          workflowIdSource: "client",
        },
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return getLogContext()?.requestId;
        }
      ),
      runWithLogContext(
        {
          requestId: "request-right",
          workflowId: "workflow-right",
          workflowIdSource: "generated",
        },
        async () => getLogContext()?.requestId
      ),
    ]);

    expect([left, right]).toEqual(["request-left", "request-right"]);
  });

  it("extends context without mutating its parent", async () => {
    await runWithLogContext(
      {
        requestId: "request-a",
        workflowId: "workflow-a",
        workflowIdSource: "client",
      },
      async () => {
        const nested = await runWithExtendedLogContext(
          { operationId: "operation-a", stage: "topics" },
          async () => getLogContext()
        );

        expect(nested).toMatchObject({ operationId: "operation-a", stage: "topics" });
        expect(getLogContext()).not.toHaveProperty("operationId");
      }
    );
  });
});
