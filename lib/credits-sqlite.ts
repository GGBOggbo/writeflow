import { DatabaseSync } from "node:sqlite";
import type { CreditBalance } from "@/types/credits";
import {
  AI_STAGES,
  CREDIT_COST_PER_GENERATION,
  CreditConflictError,
  INITIAL_CREDITS,
  InsufficientCreditsError,
  type AiStage,
} from "./credits-core";

type CreditOperationRow = {
  stage: AiStage;
  status: "pending" | "consumed" | "refunded";
};

export class SqliteCreditStore {
  private initialized = false;

  constructor(private readonly database: DatabaseSync) {}

  private ensureTables() {
    if (this.initialized) return;

    this.database.exec(`
      CREATE TABLE IF NOT EXISTS workflow_credit_accounts (
        "userId" TEXT PRIMARY KEY,
        balance INTEGER NOT NULL DEFAULT ${INITIAL_CREDITS}
          CHECK (balance >= 0),
        "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS workflow_credit_operations (
        "userId" TEXT NOT NULL,
        "operationId" TEXT NOT NULL,
        stage TEXT NOT NULL,
        cost INTEGER NOT NULL DEFAULT ${CREDIT_COST_PER_GENERATION},
        status TEXT NOT NULL CHECK (status IN ('pending', 'consumed', 'refunded')),
        "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY ("userId", "operationId")
      );
    `);

    this.initialized = true;
  }

  private getRole(userId: string): string {
    try {
      const row = this.database
        .prepare('SELECT role FROM "user" WHERE id = ?')
        .get(userId) as { role?: string } | undefined;
      return row?.role ?? "user";
    } catch {
      return "user";
    }
  }

  private isAdmin(userId: string) {
    return this.getRole(userId) === "admin";
  }

  private ensureAccount(userId: string) {
    this.database
      .prepare(
        `INSERT INTO workflow_credit_accounts
          ("userId", balance, "createdAt", "updatedAt")
         VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT("userId") DO NOTHING`
      )
      .run(userId, INITIAL_CREDITS);
  }

  private getRegularBalance(userId: string): CreditBalance {
    const row = this.database
      .prepare('SELECT balance FROM workflow_credit_accounts WHERE "userId" = ?')
      .get(userId) as { balance: number } | undefined;

    if (!row) {
      throw new CreditConflictError("未找到积分账户。");
    }

    return { unlimited: false, remaining: row.balance };
  }

  private transaction<T>(callback: () => T): T {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const result = callback();
      this.database.exec("COMMIT");
      return result;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  async getBalance(userId: string): Promise<CreditBalance> {
    this.ensureTables();

    if (this.isAdmin(userId)) {
      return { unlimited: true, remaining: null };
    }

    this.ensureAccount(userId);
    return this.getRegularBalance(userId);
  }

  async reserve(
    userId: string,
    stage: AiStage,
    operationId: string
  ): Promise<CreditBalance> {
    this.ensureTables();
    assertKnownStage(stage);

    if (this.isAdmin(userId)) {
      return { unlimited: true, remaining: null };
    }

    return this.transaction(() => {
      this.ensureAccount(userId);

      const claimed = this.database
        .prepare(
          `INSERT INTO workflow_credit_operations
            ("userId", "operationId", stage, cost, status, "createdAt", "updatedAt")
           VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT("userId", "operationId") DO NOTHING`
        )
        .run(userId, operationId, stage, CREDIT_COST_PER_GENERATION);

      if (claimed.changes !== 1) {
        const row = this.database
          .prepare(
            `SELECT stage, status
             FROM workflow_credit_operations
             WHERE "userId" = ? AND "operationId" = ?`
          )
          .get(userId, operationId) as CreditOperationRow | undefined;

        if (!row || row.stage !== stage) {
          throw new CreditConflictError("该请求标识已被其他生成步骤使用。");
        }

        if (row.status !== "refunded") {
          throw new CreditConflictError();
        }

        const retried = this.database
          .prepare(
            `UPDATE workflow_credit_operations
             SET status = 'pending', "updatedAt" = CURRENT_TIMESTAMP
             WHERE "userId" = ? AND "operationId" = ? AND status = 'refunded'`
          )
          .run(userId, operationId);

        if (retried.changes !== 1) {
          throw new CreditConflictError();
        }
      }

      const deduction = this.database
        .prepare(
          `UPDATE workflow_credit_accounts
           SET balance = balance - ?, "updatedAt" = CURRENT_TIMESTAMP
           WHERE "userId" = ? AND balance >= ?`
        )
        .run(CREDIT_COST_PER_GENERATION, userId, CREDIT_COST_PER_GENERATION);

      if (deduction.changes !== 1) {
        throw new InsufficientCreditsError();
      }

      return this.getRegularBalance(userId);
    });
  }

  async consume(userId: string, operationId: string): Promise<CreditBalance> {
    this.ensureTables();

    if (this.isAdmin(userId)) {
      return { unlimited: true, remaining: null };
    }

    return this.transaction(() => {
      this.ensureAccount(userId);

      const result = this.database
        .prepare(
          `UPDATE workflow_credit_operations
           SET status = 'consumed', "updatedAt" = CURRENT_TIMESTAMP
           WHERE "userId" = ? AND "operationId" = ? AND status = 'pending'`
        )
        .run(userId, operationId);

      if (result.changes !== 1) {
        throw new CreditConflictError("该生成请求不处于可确认状态。");
      }

      return this.getRegularBalance(userId);
    });
  }

  async refund(userId: string, operationId: string): Promise<CreditBalance> {
    this.ensureTables();

    if (this.isAdmin(userId)) {
      return { unlimited: true, remaining: null };
    }

    return this.transaction(() => {
      this.ensureAccount(userId);

      const operation = this.database
        .prepare(
          `SELECT cost, status
           FROM workflow_credit_operations
           WHERE "userId" = ? AND "operationId" = ?`
        )
        .get(userId, operationId) as
        | { cost: number; status: "pending" | "consumed" | "refunded" }
        | undefined;

      if (!operation) {
        throw new CreditConflictError("未找到可退款的生成请求。");
      }

      if (operation.status === "pending") {
        const update = this.database
          .prepare(
            `UPDATE workflow_credit_operations
             SET status = 'refunded', "updatedAt" = CURRENT_TIMESTAMP
             WHERE "userId" = ? AND "operationId" = ? AND status = 'pending'`
          )
          .run(userId, operationId);

        if (update.changes === 1) {
          this.database
            .prepare(
              `UPDATE workflow_credit_accounts
               SET balance = balance + ?, "updatedAt" = CURRENT_TIMESTAMP
               WHERE "userId" = ?`
            )
            .run(operation.cost, userId);
        }
      } else if (operation.status !== "refunded") {
        throw new CreditConflictError("该生成请求不处于可退款状态。");
      }

      return this.getRegularBalance(userId);
    });
  }
}

function assertKnownStage(stage: AiStage) {
  if (!AI_STAGES.includes(stage)) {
    throw new CreditConflictError("未知的生成步骤。");
  }
}
