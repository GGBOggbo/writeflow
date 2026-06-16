import { randomUUID } from "node:crypto";
import { getDatabaseConfig, getPostgresPool, getSqliteDatabase } from "./database";
import type { AuthOtpPurpose } from "./auth-otp";

export type AuthOtpChallenge = {
  id: string;
  email: string;
  purpose: AuthOtpPurpose;
  codeHash: string;
  attempts: number;
  createdAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
  lockedUntil: Date | null;
};

type CreateChallengeInput = {
  email: string;
  purpose: AuthOtpPurpose;
  codeHash: string;
  ipHash: string;
  expiresAt: Date;
};

let sqliteOtpTableReady = false;
let postgresOtpTableReady = false;

export async function ensureAuthOtpTable() {
  const config = getDatabaseConfig();

  if (config.provider === "sqlite") {
    if (sqliteOtpTableReady) return;

    getSqliteDatabase().exec(`
      CREATE TABLE IF NOT EXISTS auth_otp_challenges (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        purpose TEXT NOT NULL,
        "codeHash" TEXT NOT NULL,
        "ipHash" TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" TEXT NOT NULL,
        "consumedAt" TEXT,
        "lockedUntil" TEXT
      );
      CREATE INDEX IF NOT EXISTS auth_otp_email_purpose_created_idx
        ON auth_otp_challenges (email, purpose, "createdAt");
      CREATE INDEX IF NOT EXISTS auth_otp_ip_purpose_created_idx
        ON auth_otp_challenges ("ipHash", purpose, "createdAt");
    `);
    sqliteOtpTableReady = true;
    return;
  }

  if (postgresOtpTableReady) return;

  await getPostgresPool().query(`
    CREATE TABLE IF NOT EXISTS auth_otp_challenges (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      purpose TEXT NOT NULL,
      "codeHash" TEXT NOT NULL,
      "ipHash" TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "expiresAt" TIMESTAMPTZ NOT NULL,
      "consumedAt" TIMESTAMPTZ,
      "lockedUntil" TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS auth_otp_email_purpose_created_idx
      ON auth_otp_challenges (email, purpose, "createdAt");
    CREATE INDEX IF NOT EXISTS auth_otp_ip_purpose_created_idx
      ON auth_otp_challenges ("ipHash", purpose, "createdAt");
  `);
  postgresOtpTableReady = true;
}

export async function getRecentEmailChallenges({
  email,
  purpose,
  since,
}: {
  email: string;
  purpose: AuthOtpPurpose;
  since: Date;
}) {
  await ensureAuthOtpTable();
  const config = getDatabaseConfig();

  if (config.provider === "sqlite") {
    const rows = getSqliteDatabase()
      .prepare(
        `SELECT "createdAt" FROM auth_otp_challenges
         WHERE email = ? AND purpose = ? AND "createdAt" >= ?
         ORDER BY "createdAt" DESC`
      )
      .all(email, purpose, since.toISOString()) as { createdAt: string }[];

    return rows.map((row) => ({ createdAt: new Date(row.createdAt) }));
  }

  const result = await getPostgresPool().query<{ createdAt: Date }>(
    `SELECT "createdAt" FROM auth_otp_challenges
     WHERE email = $1 AND purpose = $2 AND "createdAt" >= $3
     ORDER BY "createdAt" DESC`,
    [email, purpose, since]
  );

  return result.rows;
}

export async function getRecentIpChallenges({
  ipHash,
  purpose,
  since,
}: {
  ipHash: string;
  purpose: AuthOtpPurpose;
  since: Date;
}) {
  await ensureAuthOtpTable();
  const config = getDatabaseConfig();

  if (config.provider === "sqlite") {
    const rows = getSqliteDatabase()
      .prepare(
        `SELECT "createdAt" FROM auth_otp_challenges
         WHERE "ipHash" = ? AND purpose = ? AND "createdAt" >= ?
         ORDER BY "createdAt" DESC`
      )
      .all(ipHash, purpose, since.toISOString()) as { createdAt: string }[];

    return rows.map((row) => ({ createdAt: new Date(row.createdAt) }));
  }

  const result = await getPostgresPool().query<{ createdAt: Date }>(
    `SELECT "createdAt" FROM auth_otp_challenges
     WHERE "ipHash" = $1 AND purpose = $2 AND "createdAt" >= $3
     ORDER BY "createdAt" DESC`,
    [ipHash, purpose, since]
  );

  return result.rows;
}

export async function createAuthOtpChallenge(input: CreateChallengeInput) {
  await ensureAuthOtpTable();
  const config = getDatabaseConfig();
  const id = randomUUID();
  const now = new Date();

  if (config.provider === "sqlite") {
    getSqliteDatabase()
      .prepare(
        `INSERT INTO auth_otp_challenges
         (id, email, purpose, "codeHash", "ipHash", attempts, "createdAt", "expiresAt")
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)`
      )
      .run(
        id,
        input.email,
        input.purpose,
        input.codeHash,
        input.ipHash,
        now.toISOString(),
        input.expiresAt.toISOString()
      );
    return id;
  }

  await getPostgresPool().query(
    `INSERT INTO auth_otp_challenges
     (id, email, purpose, "codeHash", "ipHash", attempts, "createdAt", "expiresAt")
     VALUES ($1, $2, $3, $4, $5, 0, $6, $7)`,
    [
      id,
      input.email,
      input.purpose,
      input.codeHash,
      input.ipHash,
      now,
      input.expiresAt,
    ]
  );
  return id;
}

export async function getLatestActiveChallenge({
  email,
  purpose,
}: {
  email: string;
  purpose: AuthOtpPurpose;
}): Promise<AuthOtpChallenge | null> {
  await ensureAuthOtpTable();
  const config = getDatabaseConfig();

  if (config.provider === "sqlite") {
    const row = getSqliteDatabase()
      .prepare(
        `SELECT id, email, purpose, "codeHash", attempts, "createdAt", "expiresAt", "consumedAt", "lockedUntil"
         FROM auth_otp_challenges
         WHERE email = ? AND purpose = ? AND "consumedAt" IS NULL
         ORDER BY "createdAt" DESC
         LIMIT 1`
      )
      .get(email, purpose) as
      | {
          id: string;
          email: string;
          purpose: AuthOtpPurpose;
          codeHash: string;
          attempts: number;
          createdAt: string;
          expiresAt: string;
          consumedAt: string | null;
          lockedUntil: string | null;
        }
      | undefined;

    if (!row) return null;
    return {
      ...row,
      createdAt: new Date(row.createdAt),
      expiresAt: new Date(row.expiresAt),
      consumedAt: row.consumedAt ? new Date(row.consumedAt) : null,
      lockedUntil: row.lockedUntil ? new Date(row.lockedUntil) : null,
    };
  }

  const result = await getPostgresPool().query<AuthOtpChallenge>(
    `SELECT id, email, purpose, "codeHash", attempts, "createdAt", "expiresAt", "consumedAt", "lockedUntil"
     FROM auth_otp_challenges
     WHERE email = $1 AND purpose = $2 AND "consumedAt" IS NULL
     ORDER BY "createdAt" DESC
     LIMIT 1`,
    [email, purpose]
  );

  return result.rows[0] ?? null;
}

export async function incrementChallengeAttempts({
  id,
  lockedUntil,
}: {
  id: string;
  lockedUntil?: Date;
}) {
  await ensureAuthOtpTable();
  const config = getDatabaseConfig();

  if (config.provider === "sqlite") {
    getSqliteDatabase()
      .prepare(
        `UPDATE auth_otp_challenges
         SET attempts = attempts + 1, "lockedUntil" = COALESCE(?, "lockedUntil")
         WHERE id = ?`
      )
      .run(lockedUntil?.toISOString() ?? null, id);
    return;
  }

  await getPostgresPool().query(
    `UPDATE auth_otp_challenges
     SET attempts = attempts + 1, "lockedUntil" = COALESCE($1, "lockedUntil")
     WHERE id = $2`,
    [lockedUntil ?? null, id]
  );
}

export async function consumeChallenge(id: string) {
  await ensureAuthOtpTable();
  const config = getDatabaseConfig();
  const now = new Date();

  if (config.provider === "sqlite") {
    getSqliteDatabase()
      .prepare(`UPDATE auth_otp_challenges SET "consumedAt" = ? WHERE id = ?`)
      .run(now.toISOString(), id);
    return;
  }

  await getPostgresPool().query(
    `UPDATE auth_otp_challenges SET "consumedAt" = $1 WHERE id = $2`,
    [now, id]
  );
}
