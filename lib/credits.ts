import Database from "better-sqlite3";
import type { CreditBalance } from "@/types/credits";

export const INITIAL_CREDITS = 5;
export const CREDIT_COST_PER_GENERATION = 1;

export const AI_STAGES = [
  "topics",
  "brief",
  "outline",
  "draft",
  "humanize",
  "meta",
] as const;

export type AiStage = (typeof AI_STAGES)[number];

type CreditOperationRow = {
  stage: AiStage;
  status: "pending" | "consumed" | "refunded";
};

export class InsufficientCreditsError extends Error {
  constructor() {
    super("积分不足，无法继续生成。");
    this.name = "InsufficientCreditsError";
  }
}

export class CreditConflictError extends Error {
  constructor(message = "该生成请求已处理，请勿重复提交。") {
    super(message);
    this.name = "CreditConflictError";
  }
}

export class CreditStore {
  constructor(private readonly db: Database.Database) {
    this.db.pragma("busy_timeout = 5000");
    this.ensureTables();
  }

  private ensureTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workflow_credit_accounts (
        userId TEXT PRIMARY KEY,
        balance INTEGER NOT NULL DEFAULT ${INITIAL_CREDITS}
          CHECK (balance >= 0),
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS workflow_credit_operations (
        userId TEXT NOT NULL,
        operationId TEXT NOT NULL,
        stage TEXT NOT NULL,
        cost INTEGER NOT NULL DEFAULT ${CREDIT_COST_PER_GENERATION},
        status TEXT NOT NULL CHECK (status IN ('pending', 'consumed', 'refunded')),
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (userId, operationId)
      );
    `);
  }

  private getRole(userId: string): string {
    try {
      const row = this.db
        .prepare("SELECT role FROM user WHERE id = ?")
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
    this.db
      .prepare(
        `INSERT OR IGNORE INTO workflow_credit_accounts
          (userId, balance, createdAt, updatedAt)
         VALUES (?, ?, datetime('now'), datetime('now'))`
      )
      .run(userId, INITIAL_CREDITS);
  }

  private getRegularBalance(userId: string): CreditBalance {
    const row = this.db
      .prepare(
        "SELECT balance FROM workflow_credit_accounts WHERE userId = ?"
      )
      .get(userId) as { balance: number };

    return { unlimited: false, remaining: row.balance };
  }

  getBalance(userId: string): CreditBalance {
    if (this.isAdmin(userId)) {
      return { unlimited: true, remaining: null };
    }

    this.ensureAccount(userId);
    return this.getRegularBalance(userId);
  }

  reserve(
    userId: string,
    stage: AiStage,
    operationId: string
  ): CreditBalance {
    if (this.isAdmin(userId)) {
      return { unlimited: true, remaining: null };
    }

    const reserveTransaction = this.db.transaction(() => {
      this.ensureAccount(userId);

      const existing = this.db
        .prepare(
          `SELECT stage, status
           FROM workflow_credit_operations
           WHERE userId = ? AND operationId = ?`
        )
        .get(userId, operationId) as CreditOperationRow | undefined;

      if (existing && existing.stage !== stage) {
        throw new CreditConflictError("该请求标识已被其他生成步骤使用。");
      }

      if (existing && existing.status !== "refunded") {
        throw new CreditConflictError();
      }

      const deduction = this.db
        .prepare(
          `UPDATE workflow_credit_accounts
           SET balance = balance - ?, updatedAt = datetime('now')
           WHERE userId = ? AND balance >= ?`
        )
        .run(
          CREDIT_COST_PER_GENERATION,
          userId,
          CREDIT_COST_PER_GENERATION
        );

      if (deduction.changes !== 1) {
        throw new InsufficientCreditsError();
      }

      if (existing) {
        this.db
          .prepare(
            `UPDATE workflow_credit_operations
             SET status = 'pending', updatedAt = datetime('now')
             WHERE userId = ? AND operationId = ? AND status = 'refunded'`
          )
          .run(userId, operationId);
      } else {
        this.db
          .prepare(
            `INSERT INTO workflow_credit_operations
              (userId, operationId, stage, cost, status, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))`
          )
          .run(userId, operationId, stage, CREDIT_COST_PER_GENERATION);
      }

      return this.getRegularBalance(userId);
    });

    return reserveTransaction.immediate();
  }

  consume(userId: string, operationId: string): CreditBalance {
    if (this.isAdmin(userId)) {
      return { unlimited: true, remaining: null };
    }

    const consumeTransaction = this.db.transaction(() => {
      this.ensureAccount(userId);
      const result = this.db
        .prepare(
          `UPDATE workflow_credit_operations
           SET status = 'consumed', updatedAt = datetime('now')
           WHERE userId = ? AND operationId = ? AND status = 'pending'`
        )
        .run(userId, operationId);

      if (result.changes !== 1) {
        throw new CreditConflictError("该生成请求不处于可确认状态。");
      }

      return this.getRegularBalance(userId);
    });

    return consumeTransaction.immediate();
  }

  refund(userId: string, operationId: string): CreditBalance {
    if (this.isAdmin(userId)) {
      return { unlimited: true, remaining: null };
    }

    const refundTransaction = this.db.transaction(() => {
      this.ensureAccount(userId);
      const operation = this.db
        .prepare(
          `SELECT stage, status
           FROM workflow_credit_operations
           WHERE userId = ? AND operationId = ?`
        )
        .get(userId, operationId) as CreditOperationRow | undefined;

      if (!operation) {
        throw new CreditConflictError("未找到可退款的生成请求。");
      }

      if (operation.status === "refunded") {
        return this.getRegularBalance(userId);
      }

      if (operation.status !== "pending") {
        throw new CreditConflictError("该生成请求不处于可退款状态。");
      }

      const update = this.db
        .prepare(
          `UPDATE workflow_credit_operations
           SET status = 'refunded', updatedAt = datetime('now')
           WHERE userId = ? AND operationId = ? AND status = 'pending'`
        )
        .run(userId, operationId);

      if (update.changes === 1) {
        this.db
          .prepare(
            `UPDATE workflow_credit_accounts
             SET balance = balance + ?, updatedAt = datetime('now')
             WHERE userId = ?`
          )
          .run(CREDIT_COST_PER_GENERATION, userId);
      }

      return this.getRegularBalance(userId);
    });

    return refundTransaction.immediate();
  }
}

const productionDb = new Database("data/auth.sqlite");

export const creditStore = new CreditStore(productionDb);
