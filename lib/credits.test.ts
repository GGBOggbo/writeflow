import { beforeEach, describe, expect, it } from "vitest";
import {
  CREDIT_UNITS_PER_CREDIT,
  CreditConflictError,
  CreditStore,
  INITIAL_CREDITS,
  InsufficientCreditsError,
  REGENERATION_CREDIT_COST_UNITS,
  creditUnitsToAmount,
} from "./credits";

/**
 * Minimal in-memory fake of pg Pool for unit testing CreditStore.
 * Supports the exact SQL patterns used by CreditStore — no real PostgreSQL needed.
 */
class FakePool {
  private users: Map<string, string> = new Map();
  private accounts: Map<string, number> = new Map();
  private operations: Map<
    string,
    { stage: string; cost: number; status: string; workflowId: string | null }
  > = new Map();
  private transactionSnapshot:
    | {
        accounts: Map<string, number>;
        operations: Map<
          string,
          { stage: string; cost: number; status: string; workflowId: string | null }
        >;
      }
    | undefined;
  failNextOperationInsert = false;

  setUserRole(userId: string, role: string) {
    this.users.set(userId, role);
  }

  setBalance(userId: string, balance: number) {
    this.accounts.set(userId, balance);
  }

  async connect() {
    return {
      query: (sql: string, params?: unknown[]) => this.query(sql, params),
      release: () => undefined,
    };
  }

  query(sql: string, params?: unknown[]) {
    const s = sql.trim().replace(/\s+/g, " ");

    if (s === "BEGIN") {
      this.transactionSnapshot = {
        accounts: new Map(this.accounts),
        operations: new Map(
          [...this.operations].map(([key, value]) => [key, { ...value }])
        ),
      };
      return { rows: [], rowCount: 0 };
    }

    if (s === "COMMIT") {
      this.transactionSnapshot = undefined;
      return { rows: [], rowCount: 0 };
    }

    if (s === "ROLLBACK") {
      if (this.transactionSnapshot) {
        this.accounts = this.transactionSnapshot.accounts;
        this.operations = this.transactionSnapshot.operations;
        this.transactionSnapshot = undefined;
      }
      return { rows: [], rowCount: 0 };
    }

    // CREATE TABLE IF NOT EXISTS — no-op
    if (/CREATE TABLE/i.test(s)) return { rows: [], rowCount: 0 };

    // SELECT role FROM "user" WHERE id = $1
    if (/SELECT role FROM .user./i.test(s)) {
      const role = this.users.get(params![0] as string) ?? "user";
      return { rows: [{ role }], rowCount: 1 };
    }

    // SELECT balance FROM workflow_credit_accounts WHERE "userId" = $1
    if (/SELECT balance FROM workflow_credit_accounts/i.test(s)) {
      const balance = this.accounts.get(params![0] as string);
      if (balance === undefined) return { rows: [], rowCount: 0 };
      return { rows: [{ balance }], rowCount: 1 };
    }

    // SELECT 1 FROM workflow_credit_operations WHERE ... status = 'pending'/'consumed'
    if (/SELECT 1 FROM workflow_credit_operations/i.test(s)) {
      const userId = params![0] as string;
      const workflowId = params![1] as string;
      const stage = params![2] as string;
      const excludedOperationId = params![3] as string | undefined;
      const status = s.match(/status = '(\w+)'/i)?.[1];
      const found = [...this.operations.entries()].some(
        ([key, op]) => {
          const [operationUserId, operationId] = key.split(":");
          return (
            operationUserId === userId &&
            operationId !== excludedOperationId &&
          op.workflowId === workflowId &&
          op.stage === stage &&
            op.status === status
          );
        }
      );
      return found
        ? { rows: [{ "?column?": 1 }], rowCount: 1 }
        : { rows: [], rowCount: 0 };
    }

    // SELECT stage, status, cost, "workflowId" FROM workflow_credit_operations WHERE ...
    if (
      /SELECT stage, status/i.test(s) &&
      /FROM workflow_credit_operations/i.test(s)
    ) {
      const key = `${params![0]}:${params![1]}`;
      const op = this.operations.get(key);
      if (!op) return { rows: [], rowCount: 0 };
      return {
        rows: [
          {
            stage: op.stage,
            status: op.status,
            cost: op.cost,
            workflowId: op.workflowId,
          },
        ],
        rowCount: 1,
      };
    }

    // INSERT INTO workflow_credit_accounts ... ON CONFLICT DO NOTHING
    if (/INSERT INTO workflow_credit_accounts/i.test(s)) {
      const userId = params![0] as string;
      const balance = params![1] as number;
      if (!this.accounts.has(userId)) {
        this.accounts.set(userId, balance);
      }
      return { rows: [], rowCount: 1 };
    }

    // UPDATE workflow_credit_accounts SET balance = balance - $1 ... WHERE balance >= $1
    if (
      /UPDATE workflow_credit_accounts.*SET balance = balance -/i.test(s)
    ) {
      const amount = params![0] as number;
      const userId = params![1] as string;
      const current = this.accounts.get(userId) ?? 0;
      if (current < amount) return { rows: [], rowCount: 0 };
      this.accounts.set(userId, current - amount);
      return { rows: [{ balance: current - amount }], rowCount: 1 };
    }

    // UPDATE workflow_credit_accounts SET balance = balance + $1
    if (
      /UPDATE workflow_credit_accounts.*SET balance = balance \+/i.test(s)
    ) {
      const amount = params![0] as number;
      const userId = params![1] as string;
      const current = this.accounts.get(userId) ?? 0;
      this.accounts.set(userId, current + amount);
      return { rows: [{ balance: current + amount }], rowCount: 1 };
    }

    // UPDATE workflow_credit_operations SET status = ... WHERE ...
    if (/UPDATE workflow_credit_operations/i.test(s)) {
      const userId = params![0] as string;
      const operationId = params![1] as string;
      const key = `${userId}:${operationId}`;
      const op = this.operations.get(key);
      const requiredStatus =
        s.match(/AND status = '(\w+)'/i)?.[1] ?? "pending";
      if (!op || op.status !== requiredStatus) {
        return { rows: [], rowCount: 0 };
      }

      // Determine new status from the SQL
      const statusMatch = s.match(/SET status = '(\w+)'/);
      if (statusMatch) {
        op.status = statusMatch[1];
      }
      return {
        rows: [{ cost: op.cost, status: op.status }],
        rowCount: 1,
      };
    }

    // INSERT INTO workflow_credit_operations ...
    if (/INSERT INTO workflow_credit_operations/i.test(s)) {
      if (this.failNextOperationInsert) {
        this.failNextOperationInsert = false;
        throw new Error("simulated operation insert failure");
      }

      const userId = params![0] as string;
      const operationId = params![1] as string;
      const hasWorkflowId = /"workflowId"/i.test(s);
      const workflowId = hasWorkflowId ? (params![2] as string) : null;
      const stage = hasWorkflowId ? (params![3] as string) : (params![2] as string);
      const cost = hasWorkflowId ? (params![4] as number) : (params![3] as number);
      const key = `${userId}:${operationId}`;
      if (this.operations.has(key) && /ON CONFLICT/i.test(s)) {
        return { rows: [], rowCount: 0 };
      }
      this.operations.set(key, { stage, cost, status: "pending", workflowId });
      return {
        rows: [{ stage, status: "pending" }],
        rowCount: 1,
      };
    }

    return { rows: [], rowCount: 0 };
  }
}

describe("CreditStore", () => {
  let pool: FakePool;
  let store: CreditStore;

  beforeEach(() => {
    pool = new FakePool();
    // Pre-populate users table
    pool.setUserRole("regular-user", "user");
    pool.setUserRole("admin-user", "admin");
    store = new CreditStore(pool as unknown as import("@neondatabase/serverless").Pool);
  });

  it("uses fixed credit units for display balances", () => {
    expect(CREDIT_UNITS_PER_CREDIT).toBe(100);
    expect(INITIAL_CREDITS).toBe(500);
    expect(REGENERATION_CREDIT_COST_UNITS).toBe(5);
    expect(creditUnitsToAmount(500)).toBe(5);
    expect(creditUnitsToAmount(495)).toBe(4.95);
  });

  it("gives a regular user five initial credits", async () => {
    expect(await store.getBalance("regular-user")).toEqual({
      unlimited: false,
      remaining: 5,
    });
  });

  it("does not limit administrators", async () => {
    expect(await store.getBalance("admin-user")).toEqual({
      unlimited: true,
      remaining: null,
    });

    expect(
      await store.reserve(
        "admin-user",
        "topics",
        "admin-operation",
        "workflow-a"
      )
    ).toEqual({
      unlimited: true,
      remaining: null,
    });
  });

  it("makes the first successful generation in a workflow stage free", async () => {
    await expect(
      store.reserve("regular-user", "topics", "operation-1", "workflow-a")
    ).resolves.toEqual({
      unlimited: false,
      remaining: 5,
    });

    await expect(store.consume("regular-user", "operation-1")).resolves.toEqual({
      unlimited: false,
      remaining: 5,
    });
  });

  it("rolls back the deduction when recording the operation fails", async () => {
    pool.failNextOperationInsert = true;

    await expect(
      store.reserve("regular-user", "topics", "operation-1", "workflow-a")
    ).rejects.toThrow("simulated operation insert failure");

    expect((await store.getBalance("regular-user")).remaining).toBe(5);
  });

  it("charges 0.05 credits for regenerating the same workflow stage", async () => {
    await store.reserve("regular-user", "topics", "operation-1", "workflow-a");
    await store.consume("regular-user", "operation-1");

    await expect(
      store.reserve("regular-user", "topics", "operation-2", "workflow-a")
    ).resolves.toEqual({
      unlimited: false,
      remaining: 4.95,
    });

    await expect(store.consume("regular-user", "operation-2")).resolves.toEqual({
      unlimited: false,
      remaining: 4.95,
    });
  });

  it("keeps different stages and workflows free for their first success", async () => {
    await store.reserve("regular-user", "topics", "operation-1", "workflow-a");
    await store.consume("regular-user", "operation-1");

    await expect(
      store.reserve("regular-user", "brief", "operation-2", "workflow-a")
    ).resolves.toEqual({
      unlimited: false,
      remaining: 5,
    });

    await expect(
      store.reserve("regular-user", "topics", "operation-3", "workflow-b")
    ).resolves.toEqual({
      unlimited: false,
      remaining: 5,
    });
  });

  it("lets a zero-balance user run a first free generation but rejects regeneration", async () => {
    await store.reserve("regular-user", "topics", "operation-1", "workflow-a");
    await store.consume("regular-user", "operation-1");
    pool.setBalance("regular-user", 0);

    await expect(
      store.reserve("regular-user", "brief", "operation-2", "workflow-a")
    ).resolves.toEqual({
      unlimited: false,
      remaining: 0,
    });

    await expect(
      store.reserve("regular-user", "topics", "operation-3", "workflow-a")
    ).rejects.toThrow(InsufficientCreditsError);
  });

  it("rejects a duplicate pending or consumed operation", async () => {
    await store.reserve("regular-user", "topics", "operation-1", "workflow-a");

    await expect(
      store.reserve("regular-user", "topics", "operation-1", "workflow-a")
    ).rejects.toThrow(CreditConflictError);

    await store.consume("regular-user", "operation-1");

    await expect(
      store.reserve("regular-user", "topics", "operation-1", "workflow-a")
    ).rejects.toThrow(CreditConflictError);
    expect((await store.getBalance("regular-user")).remaining).toBe(5);
  });

  it("rejects reusing an operation id for another stage", async () => {
    await store.reserve("regular-user", "topics", "operation-1", "workflow-a");

    await expect(
      store.reserve("regular-user", "draft", "operation-1", "workflow-a")
    ).rejects.toThrow(CreditConflictError);
  });

  it("rejects reusing an operation id for another workflow", async () => {
    await store.reserve("regular-user", "topics", "operation-1", "workflow-a");
    await store.refund("regular-user", "operation-1");

    await expect(
      store.reserve("regular-user", "topics", "operation-1", "workflow-b")
    ).rejects.toThrow(CreditConflictError);
  });

  it("refunds a failed operation exactly once", async () => {
    await store.reserve("regular-user", "draft", "operation-1", "workflow-a");

    expect(
      (await store.refund("regular-user", "operation-1")).remaining
    ).toBe(5);
    expect(
      (await store.refund("regular-user", "operation-1")).remaining
    ).toBe(5);
  });

  it("allows a refunded operation to reserve again", async () => {
    await store.reserve("regular-user", "meta", "operation-1", "workflow-a");
    await store.refund("regular-user", "operation-1");

    expect(
      await store.reserve("regular-user", "meta", "operation-1", "workflow-a")
    ).toEqual({
      unlimited: false,
      remaining: 5,
    });
  });

  it("refunds only the reserved regeneration cost and reuses a refunded operation id", async () => {
    await store.reserve("regular-user", "draft", "operation-1", "workflow-a");
    await store.consume("regular-user", "operation-1");
    await store.reserve("regular-user", "draft", "operation-2", "workflow-a");

    await expect(store.refund("regular-user", "operation-2")).resolves.toEqual({
      unlimited: false,
      remaining: 5,
    });

    await expect(
      store.reserve("regular-user", "draft", "operation-2", "workflow-a")
    ).resolves.toEqual({
      unlimited: false,
      remaining: 4.95,
    });
  });

  it("rejects concurrent generation for the same workflow stage", async () => {
    await store.reserve("regular-user", "outline", "operation-1", "workflow-a");

    await expect(
      store.reserve("regular-user", "outline", "operation-2", "workflow-a")
    ).rejects.toThrow(CreditConflictError);
  });

  it("only consumes pending operations", async () => {
    await store.reserve("regular-user", "outline", "operation-1", "workflow-a");

    expect(
      (await store.consume("regular-user", "operation-1")).remaining
    ).toBe(5);
    await expect(store.consume("regular-user", "operation-1")).rejects.toThrow(
      CreditConflictError
    );
  });
});
