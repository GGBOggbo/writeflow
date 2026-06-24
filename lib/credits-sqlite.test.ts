import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import { CreditConflictError, InsufficientCreditsError } from "./credits";
import { SqliteCreditStore } from "./credits-sqlite";

describe("SqliteCreditStore", () => {
  let database: DatabaseSync;
  let store: SqliteCreditStore;

  beforeEach(() => {
    database = new DatabaseSync(":memory:");
    database.exec(`
      CREATE TABLE "user" (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL DEFAULT 'user'
      );
      INSERT INTO "user" (id, role) VALUES ('regular-user', 'user');
      INSERT INTO "user" (id, role) VALUES ('admin-user', 'admin');
    `);
    store = new SqliteCreditStore(database);
  });

  it("gives regular users five local credits", async () => {
    await expect(store.getBalance("regular-user")).resolves.toEqual({
      unlimited: false,
      remaining: 5,
    });
  });

  it("keeps administrators unlimited", async () => {
    await expect(
      store.reserve("admin-user", "topics", "op-1", "workflow-a")
    ).resolves.toEqual({
      unlimited: true,
      remaining: null,
    });
  });

  it("makes the first successful generation in a workflow stage free", async () => {
    await expect(
      store.reserve("regular-user", "topics", "op-1", "workflow-a")
    ).resolves.toEqual({
      unlimited: false,
      remaining: 5,
    });

    await expect(store.consume("regular-user", "op-1")).resolves.toEqual({
      unlimited: false,
      remaining: 5,
    });
  });

  it("charges 0.05 credits for regenerating the same workflow stage", async () => {
    await store.reserve("regular-user", "topics", "op-1", "workflow-a");
    await store.consume("regular-user", "op-1");

    await expect(
      store.reserve("regular-user", "topics", "op-2", "workflow-a")
    ).resolves.toEqual({
      unlimited: false,
      remaining: 4.95,
    });

    await expect(store.consume("regular-user", "op-2")).resolves.toEqual({
      unlimited: false,
      remaining: 4.95,
    });
  });

  it("keeps different stages and workflows free for their first success", async () => {
    await store.reserve("regular-user", "topics", "op-1", "workflow-a");
    await store.consume("regular-user", "op-1");

    await expect(
      store.reserve("regular-user", "brief", "op-2", "workflow-a")
    ).resolves.toEqual({
      unlimited: false,
      remaining: 5,
    });

    await expect(
      store.reserve("regular-user", "topics", "op-3", "workflow-b")
    ).resolves.toEqual({
      unlimited: false,
      remaining: 5,
    });
  });

  it("rejects duplicate pending or consumed operations", async () => {
    await store.reserve("regular-user", "topics", "op-1", "workflow-a");

    await expect(
      store.reserve("regular-user", "topics", "op-1", "workflow-a")
    ).rejects.toThrow(CreditConflictError);

    await store.consume("regular-user", "op-1");

    await expect(
      store.reserve("regular-user", "topics", "op-1", "workflow-a")
    ).rejects.toThrow(CreditConflictError);
  });

  it("allows retrying the same refunded operation id for the same stage", async () => {
    await store.reserve("regular-user", "outline", "op-1", "workflow-a");
    await store.refund("regular-user", "op-1");

    await expect(
      store.reserve("regular-user", "outline", "op-1", "workflow-a")
    ).resolves.toEqual({
      unlimited: false,
      remaining: 5,
    });
  });

  it("lets a zero-balance user run a first free generation but rejects regeneration", async () => {
    await store.reserve("regular-user", "topics", "op-1", "workflow-a");
    await store.consume("regular-user", "op-1");
    database
      .prepare('UPDATE workflow_credit_accounts SET balance = 0 WHERE "userId" = ?')
      .run("regular-user");

    await expect(
      store.reserve("regular-user", "brief", "op-2", "workflow-a")
    ).resolves.toEqual({
      unlimited: false,
      remaining: 0,
    });

    await expect(
      store.reserve("regular-user", "topics", "op-3", "workflow-a")
    ).rejects.toThrow(InsufficientCreditsError);
  });

  it("refunds only the reserved regeneration cost and reuses a refunded operation id", async () => {
    await store.reserve("regular-user", "draft", "op-1", "workflow-a");
    await store.consume("regular-user", "op-1");
    await store.reserve("regular-user", "draft", "op-2", "workflow-a");

    await expect(store.refund("regular-user", "op-2")).resolves.toEqual({
      unlimited: false,
      remaining: 5,
    });

    await expect(
      store.reserve("regular-user", "draft", "op-2", "workflow-a")
    ).resolves.toEqual({
      unlimited: false,
      remaining: 4.95,
    });
  });

  it("rejects concurrent generation for the same workflow stage", async () => {
    await store.reserve("regular-user", "outline", "op-1", "workflow-a");

    await expect(
      store.reserve("regular-user", "outline", "op-2", "workflow-a")
    ).rejects.toThrow(CreditConflictError);
  });

  it("migrates legacy integer credits to fixed units exactly once", async () => {
    const legacy = new DatabaseSync(":memory:");
    legacy.exec(`
      CREATE TABLE "user" (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL DEFAULT 'user'
      );
      INSERT INTO "user" (id, role) VALUES ('regular-user', 'user');

      CREATE TABLE workflow_credit_accounts (
        "userId" TEXT PRIMARY KEY,
        balance INTEGER NOT NULL DEFAULT 5 CHECK (balance >= 0),
        "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE workflow_credit_operations (
        "userId" TEXT NOT NULL,
        "operationId" TEXT NOT NULL,
        stage TEXT NOT NULL,
        cost INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL CHECK (status IN ('pending', 'consumed', 'refunded')),
        "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY ("userId", "operationId")
      );

      INSERT INTO workflow_credit_accounts ("userId", balance)
      VALUES ('regular-user', 5);
      INSERT INTO workflow_credit_operations
        ("userId", "operationId", stage, cost, status)
      VALUES ('regular-user', 'legacy-op', 'topics', 1, 'consumed');
    `);

    const legacyStore = new SqliteCreditStore(legacy);
    await expect(legacyStore.getBalance("regular-user")).resolves.toEqual({
      unlimited: false,
      remaining: 5,
    });
    await expect(legacyStore.getBalance("regular-user")).resolves.toEqual({
      unlimited: false,
      remaining: 5,
    });

    const account = legacy
      .prepare('SELECT balance FROM workflow_credit_accounts WHERE "userId" = ?')
      .get("regular-user") as { balance: number };
    const operation = legacy
      .prepare(
        'SELECT cost, "workflowId" FROM workflow_credit_operations WHERE "operationId" = ?'
      )
      .get("legacy-op") as { cost: number; workflowId: string | null };

    expect(account.balance).toBe(500);
    expect(operation.cost).toBe(100);
    expect(operation.workflowId).toBeNull();
  });
});
