import { Pool, type PoolClient } from "@neondatabase/serverless";
import type { CreditBalance } from "@/types/credits";
import {
  AI_STAGES,
  CREDIT_COST_PER_GENERATION,
  CREDIT_UNITS_PER_CREDIT,
  CreditConflictError,
  FREE_GENERATION_CREDIT_COST_UNITS,
  INITIAL_CREDITS,
  InsufficientCreditsError,
  REGENERATION_CREDIT_COST_UNITS,
  creditUnitsToAmount,
  type AiStage,
} from "./credits-core";
import { getDatabaseConfig, getPostgresPool, getSqliteDatabase } from "./database";
import { SqliteCreditStore } from "./credits-sqlite";

export {
  AI_STAGES,
  CREDIT_COST_PER_GENERATION,
  CREDIT_UNITS_PER_CREDIT,
  CreditConflictError,
  FREE_GENERATION_CREDIT_COST_UNITS,
  INITIAL_CREDITS,
  InsufficientCreditsError,
  REGENERATION_CREDIT_COST_UNITS,
  creditUnitsToAmount,
  type AiStage,
};

type CreditOperationRow = {
  stage: AiStage;
  status: "pending" | "consumed" | "refunded";
};

type Queryable = Pool | PoolClient;
type CreditStoreLike = Pick<
  CreditStore,
  "getBalance" | "reserve" | "consume" | "refund"
>;

export class CreditStore {
  private initialized = false;

  constructor(private readonly pool: Pool) {}

  private async ensureTables() {
    if (this.initialized) return;
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS workflow_credit_accounts (
        "userId" TEXT PRIMARY KEY,
        balance INTEGER NOT NULL DEFAULT ${INITIAL_CREDITS}
          CHECK (balance >= 0),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS workflow_credit_operations (
        "userId" TEXT NOT NULL,
        "operationId" TEXT NOT NULL,
        stage TEXT NOT NULL,
        cost INTEGER NOT NULL DEFAULT ${CREDIT_COST_PER_GENERATION},
        status TEXT NOT NULL CHECK (status IN ('pending', 'consumed', 'refunded')),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY ("userId", "operationId")
      );
    `);
    this.initialized = true;
  }

  private async getRole(userId: string): Promise<string> {
    try {
      const result = await this.pool.query(
        `SELECT role FROM "user" WHERE id = $1`,
        [userId]
      );
      return result.rows[0]?.role ?? "user";
    } catch {
      return "user";
    }
  }

  private async isAdmin(userId: string) {
    return (await this.getRole(userId)) === "admin";
  }

  private async ensureAccount(userId: string, database: Queryable = this.pool) {
    await database.query(
      `INSERT INTO workflow_credit_accounts ("userId", balance, "createdAt", "updatedAt")
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT ("userId") DO NOTHING`,
      [userId, INITIAL_CREDITS]
    );
  }

  private async getRegularBalance(
    userId: string,
    database: Queryable = this.pool
  ): Promise<CreditBalance> {
    const result = await database.query(
      `SELECT balance FROM workflow_credit_accounts WHERE "userId" = $1`,
      [userId]
    );

    return { unlimited: false, remaining: result.rows[0].balance };
  }

  private async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getBalance(userId: string): Promise<CreditBalance> {
    await this.ensureTables();

    if (await this.isAdmin(userId)) {
      return { unlimited: true, remaining: null };
    }

    await this.ensureAccount(userId);
    return this.getRegularBalance(userId);
  }

  async reserve(
    userId: string,
    stage: AiStage,
    operationId: string
  ): Promise<CreditBalance> {
    await this.ensureTables();

    if (await this.isAdmin(userId)) {
      return { unlimited: true, remaining: null };
    }

    return this.transaction(async (client) => {
      await this.ensureAccount(userId, client);

      const claimed = await client.query(
        `INSERT INTO workflow_credit_operations
          ("userId", "operationId", stage, cost, status, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, 'pending', NOW(), NOW())
         ON CONFLICT ("userId", "operationId") DO NOTHING
         RETURNING stage, status`,
        [userId, operationId, stage, CREDIT_COST_PER_GENERATION]
      );

      if (claimed.rowCount !== 1) {
        const existing = await client.query(
          `SELECT stage, status
           FROM workflow_credit_operations
           WHERE "userId" = $1 AND "operationId" = $2
           FOR UPDATE`,
          [userId, operationId]
        );

        const row = existing.rows[0] as CreditOperationRow | undefined;

        if (!row || row.stage !== stage) {
          throw new CreditConflictError(
            "该请求标识已被其他生成步骤使用。"
          );
        }

        if (row.status !== "refunded") {
          throw new CreditConflictError();
        }

        const retried = await client.query(
        `UPDATE workflow_credit_operations
         SET status = 'pending', "updatedAt" = NOW()
         WHERE "userId" = $1 AND "operationId" = $2 AND status = 'refunded'
         RETURNING status`,
          [userId, operationId]
        );

        if (retried.rowCount !== 1) {
          throw new CreditConflictError();
        }
      }

      const deduction = await client.query(
        `UPDATE workflow_credit_accounts
         SET balance = balance - $1, "updatedAt" = NOW()
         WHERE "userId" = $2 AND balance >= $1
         RETURNING balance`,
        [CREDIT_COST_PER_GENERATION, userId]
      );

      if (deduction.rowCount !== 1) {
        throw new InsufficientCreditsError();
      }

      return {
        unlimited: false,
        remaining: deduction.rows[0].balance,
      };
    });
  }

  async consume(userId: string, operationId: string): Promise<CreditBalance> {
    await this.ensureTables();

    if (await this.isAdmin(userId)) {
      return { unlimited: true, remaining: null };
    }

    return this.transaction(async (client) => {
      await this.ensureAccount(userId, client);

      const result = await client.query(
        `UPDATE workflow_credit_operations
         SET status = 'consumed', "updatedAt" = NOW()
         WHERE "userId" = $1 AND "operationId" = $2 AND status = 'pending'`,
        [userId, operationId]
      );

      if (result.rowCount !== 1) {
        throw new CreditConflictError("该生成请求不处于可确认状态。");
      }

      return this.getRegularBalance(userId, client);
    });
  }

  async refund(userId: string, operationId: string): Promise<CreditBalance> {
    await this.ensureTables();

    if (await this.isAdmin(userId)) {
      return { unlimited: true, remaining: null };
    }

    return this.transaction(async (client) => {
      await this.ensureAccount(userId, client);

      const update = await client.query(
        `UPDATE workflow_credit_operations
         SET status = 'refunded', "updatedAt" = NOW()
         WHERE "userId" = $1 AND "operationId" = $2 AND status = 'pending'
         RETURNING cost`,
        [userId, operationId]
      );

      if (update.rowCount === 1) {
        const balance = await client.query(
        `UPDATE workflow_credit_accounts
         SET balance = balance + $1, "updatedAt" = NOW()
         WHERE "userId" = $2
         RETURNING balance`,
          [update.rows[0].cost, userId]
        );

        return {
          unlimited: false,
          remaining: balance.rows[0].balance,
        };
      }

      const operation = await client.query(
        `SELECT stage, status
         FROM workflow_credit_operations
         WHERE "userId" = $1 AND "operationId" = $2
         FOR UPDATE`,
        [userId, operationId]
      );

      const row = operation.rows[0] as CreditOperationRow | undefined;

      if (!row) {
        throw new CreditConflictError("未找到可退款的生成请求。");
      }

      if (row.status !== "refunded") {
        throw new CreditConflictError("该生成请求不处于可退款状态。");
      }

      return this.getRegularBalance(userId, client);
    });
  }
}

let store: CreditStoreLike | undefined;

function getCreditStore(): CreditStoreLike {
  if (!store) {
    const databaseConfig = getDatabaseConfig();
    store =
      databaseConfig.provider === "sqlite"
        ? new SqliteCreditStore(getSqliteDatabase())
        : new CreditStore(getPostgresPool());
  }

  return store;
}

export const creditStore: CreditStoreLike = {
  getBalance: (...args) => getCreditStore().getBalance(...args),
  reserve: (...args) => getCreditStore().reserve(...args),
  consume: (...args) => getCreditStore().consume(...args),
  refund: (...args) => getCreditStore().refund(...args),
};
