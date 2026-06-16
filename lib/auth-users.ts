import { randomUUID } from "node:crypto";
import { hashPassword } from "@better-auth/utils/password";
import { getDatabaseConfig, getPostgresPool, getSqliteDatabase } from "./database";

export type AuthUserLookup = {
  id: string;
  email: string;
  emailVerified: boolean;
};

export async function getAuthUserByEmail(
  email: string
): Promise<AuthUserLookup | null> {
  const normalizedEmail = email.toLowerCase();
  const config = getDatabaseConfig();

  if (config.provider === "sqlite") {
    const database = getSqliteDatabase();
    const row = database
      .prepare('SELECT id, email, "emailVerified" FROM "user" WHERE email = ? LIMIT 1')
      .get(normalizedEmail) as
      | { id: string; email: string; emailVerified: number | boolean }
      | undefined;

    if (!row) return null;

    return {
      id: row.id,
      email: row.email,
      emailVerified: Boolean(row.emailVerified),
    };
  }

  const pool = getPostgresPool();
  const result = await pool.query<{
    id: string;
    email: string;
    emailVerified: boolean;
  }>('SELECT id, email, "emailVerified" FROM "user" WHERE email = $1 LIMIT 1', [
    normalizedEmail,
  ]);
  const row = result.rows[0];

  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    emailVerified: row.emailVerified,
  };
}

export async function createVerifiedCredentialUser({
  email,
  name,
  password,
}: {
  email: string;
  name: string;
  password: string;
}) {
  const normalizedEmail = email.toLowerCase();
  const passwordHash = await hashPassword(password);
  const userId = randomUUID();
  const accountId = randomUUID();
  const config = getDatabaseConfig();

  if (config.provider === "sqlite") {
    const database = getSqliteDatabase();
    const now = new Date().toISOString();

    database.exec("BEGIN");
    try {
      database
        .prepare(
          `INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
           VALUES (?, ?, ?, 1, ?, ?)`
        )
        .run(userId, name, normalizedEmail, now, now);
      database
        .prepare(
          `INSERT INTO "account" (id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt")
           VALUES (?, ?, ?, 'credential', ?, ?, ?)`
        )
        .run(accountId, userId, userId, passwordHash, now, now);
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }

    return { id: userId, email: normalizedEmail, emailVerified: true };
  }

  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO "user" (id, name, email, "emailVerified", role)
       VALUES ($1, $2, $3, TRUE, 'user')`,
      [userId, name, normalizedEmail]
    );
    await client.query(
      `INSERT INTO "account" (id, "userId", "accountId", "providerId", password)
       VALUES ($1, $2, $3, 'credential', $4)`,
      [accountId, userId, userId, passwordHash]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return { id: userId, email: normalizedEmail, emailVerified: true };
}

export async function verifyUserAndSetCredentialPassword({
  userId,
  name,
  password,
}: {
  userId: string;
  name: string;
  password: string;
}) {
  const passwordHash = await hashPassword(password);
  const config = getDatabaseConfig();

  if (config.provider === "sqlite") {
    const database = getSqliteDatabase();
    const now = new Date().toISOString();
    const account = database
      .prepare(
        `SELECT id FROM "account"
         WHERE "userId" = ? AND "providerId" = 'credential'
         LIMIT 1`
      )
      .get(userId) as { id: string } | undefined;

    database.exec("BEGIN");
    try {
      database
        .prepare(
          `UPDATE "user"
           SET name = ?, "emailVerified" = 1, "updatedAt" = ?
           WHERE id = ?`
        )
        .run(name, now, userId);

      if (account) {
        database
          .prepare(`UPDATE "account" SET password = ?, "updatedAt" = ? WHERE id = ?`)
          .run(passwordHash, now, account.id);
      } else {
        database
          .prepare(
            `INSERT INTO "account" (id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt")
             VALUES (?, ?, ?, 'credential', ?, ?, ?)`
          )
          .run(randomUUID(), userId, userId, passwordHash, now, now);
      }

      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }

    return;
  }

  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE "user"
       SET name = $1, "emailVerified" = TRUE, "updatedAt" = NOW()
       WHERE id = $2`,
      [name, userId]
    );
    const account = await client.query<{ id: string }>(
      `SELECT id FROM "account"
       WHERE "userId" = $1 AND "providerId" = 'credential'
       LIMIT 1`,
      [userId]
    );

    if (account.rows[0]) {
      await client.query(
        `UPDATE "account" SET password = $1, "updatedAt" = NOW() WHERE id = $2`,
        [passwordHash, account.rows[0].id]
      );
    } else {
      await client.query(
        `INSERT INTO "account" (id, "userId", "accountId", "providerId", password)
         VALUES ($1, $2, $3, 'credential', $4)`,
        [randomUUID(), userId, userId, passwordHash]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function setCredentialPasswordAndRevokeSessions({
  userId,
  password,
}: {
  userId: string;
  password: string;
}) {
  const passwordHash = await hashPassword(password);
  const config = getDatabaseConfig();

  if (config.provider === "sqlite") {
    const database = getSqliteDatabase();
    const now = new Date().toISOString();
    const account = database
      .prepare(
        `SELECT id FROM "account"
         WHERE "userId" = ? AND "providerId" = 'credential'
         LIMIT 1`
      )
      .get(userId) as { id: string } | undefined;

    database.exec("BEGIN");
    try {
      if (account) {
        database
          .prepare(`UPDATE "account" SET password = ?, "updatedAt" = ? WHERE id = ?`)
          .run(passwordHash, now, account.id);
      } else {
        database
          .prepare(
            `INSERT INTO "account" (id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt")
             VALUES (?, ?, ?, 'credential', ?, ?, ?)`
          )
          .run(randomUUID(), userId, userId, passwordHash, now, now);
      }
      database.prepare(`DELETE FROM "session" WHERE "userId" = ?`).run(userId);
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }

    return;
  }

  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const account = await client.query<{ id: string }>(
      `SELECT id FROM "account"
       WHERE "userId" = $1 AND "providerId" = 'credential'
       LIMIT 1`,
      [userId]
    );

    if (account.rows[0]) {
      await client.query(
        `UPDATE "account" SET password = $1, "updatedAt" = NOW() WHERE id = $2`,
        [passwordHash, account.rows[0].id]
      );
    } else {
      await client.query(
        `INSERT INTO "account" (id, "userId", "accountId", "providerId", password)
         VALUES ($1, $2, $3, 'credential', $4)`,
        [randomUUID(), userId, userId, passwordHash]
      );
    }

    await client.query(`DELETE FROM "session" WHERE "userId" = $1`, [userId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
