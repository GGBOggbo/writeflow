/**
 * One-shot migration script.
 *
 * Local development can use SQLite:
 *   DATABASE_PROVIDER=sqlite DATABASE_URL=file:./data/dev.sqlite npm run db:migrate
 *
 * Production can use Neon/PostgreSQL:
 *   DATABASE_PROVIDER=postgres DATABASE_URL=postgresql://... npm run db:migrate
 */
import { existsSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, join, normalize } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Pool } from "@neondatabase/serverless";

const provider = (process.env.DATABASE_PROVIDER || "postgres").toLowerCase();

if (provider === "sqlite") {
  migrateSqlite();
} else if (provider === "postgres") {
  await migratePostgres();
} else {
  throw new Error(
    `Unsupported DATABASE_PROVIDER "${provider}". Use "postgres" or "sqlite".`
  );
}

function migrateSqlite() {
  const databasePath = parseSqlitePath(
    process.env.DATABASE_URL || "file:./data/dev.sqlite"
  );

  if (databasePath !== ":memory:") {
    const directory = dirname(databasePath);
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }
  }

  const database = new DatabaseSync(databasePath);
  database.exec("PRAGMA foreign_keys = ON;");

  console.log(`Migrating SQLite database: ${databasePath}`);

  database.exec(`
    CREATE TABLE IF NOT EXISTS "user" (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      "emailVerified" INTEGER NOT NULL DEFAULT 0,
      image TEXT,
      "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      role TEXT NOT NULL DEFAULT 'user'
    );

    CREATE TABLE IF NOT EXISTS "session" (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      "expiresAt" TEXT NOT NULL,
      "ipAddress" TEXT,
      "userAgent" TEXT,
      "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "session_userId_idx"
      ON "session" ("userId");

    CREATE TABLE IF NOT EXISTS "account" (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      "accountId" TEXT NOT NULL,
      "providerId" TEXT NOT NULL,
      "accessToken" TEXT,
      "refreshToken" TEXT,
      "accessTokenExpiresAt" TEXT,
      "refreshTokenExpiresAt" TEXT,
      scope TEXT,
      "idToken" TEXT,
      password TEXT,
      "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "account_userId_idx"
      ON "account" ("userId");

    CREATE TABLE IF NOT EXISTS "verification" (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      "expiresAt" TEXT NOT NULL,
      "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workflow_credit_accounts (
      "userId" TEXT PRIMARY KEY,
      balance INTEGER NOT NULL DEFAULT 5 CHECK (balance >= 0),
      "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workflow_credit_operations (
      "userId" TEXT NOT NULL,
      "operationId" TEXT NOT NULL,
      stage TEXT NOT NULL,
      cost INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL CHECK (status IN ('pending', 'consumed', 'refunded')),
      "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("userId", "operationId")
    );
  `);

  seedSqliteAdmins(database);
  database.close();
  console.log("\nSQLite migration complete!");
}

async function migratePostgres() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }

  const pool = new Pool({ connectionString });

  console.log("Migrating PostgreSQL database...");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "user" (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
      image TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("  ✓ user");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "session" (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      "token" TEXT NOT NULL,
      "expiresAt" TIMESTAMPTZ NOT NULL,
      "ipAddress" TEXT,
      "userAgent" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "session_token_idx"
      ON "session" ("token");
    CREATE INDEX IF NOT EXISTS "session_userId_idx"
      ON "session" ("userId");
  `);
  console.log("  ✓ session");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "account" (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      "accountId" TEXT NOT NULL,
      "providerId" TEXT NOT NULL,
      "accessToken" TEXT,
      "refreshToken" TEXT,
      "accessTokenExpiresAt" TIMESTAMPTZ,
      "refreshTokenExpiresAt" TIMESTAMPTZ,
      "scope" TEXT,
      "idToken" TEXT,
      "password" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS "account_userId_idx"
      ON "account" ("userId");
  `);
  console.log("  ✓ account");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "verification" (
      id TEXT PRIMARY KEY,
      "identifier" TEXT NOT NULL,
      "value" TEXT NOT NULL,
      "expiresAt" TIMESTAMPTZ NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("  ✓ verification");

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user' AND column_name = 'role'
      ) THEN
        ALTER TABLE "user" ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
      END IF;
    END $$;
  `);
  console.log("  ✓ user.role column");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS workflow_credit_accounts (
      "userId" TEXT PRIMARY KEY,
      balance INTEGER NOT NULL DEFAULT 5 CHECK (balance >= 0),
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("  ✓ workflow_credit_accounts");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS workflow_credit_operations (
      "userId" TEXT NOT NULL,
      "operationId" TEXT NOT NULL,
      stage TEXT NOT NULL,
      cost INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL CHECK (status IN ('pending', 'consumed', 'refunded')),
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY ("userId", "operationId")
    );
  `);
  console.log("  ✓ workflow_credit_operations");

  await seedPostgresAdmins(pool);
  await pool.end();
  console.log("\nPostgreSQL migration complete!");
}

function parseSqlitePath(databaseUrl) {
  if (databaseUrl === ":memory:") return databaseUrl;

  if (!databaseUrl.startsWith("file:")) {
    throw new Error('SQLite DATABASE_URL must use "file:" or ":memory:".');
  }

  const rawPath = databaseUrl.slice("file:".length);
  if (!rawPath) {
    throw new Error("SQLite DATABASE_URL is missing a file path.");
  }

  if (isAbsolute(rawPath)) {
    return rawPath;
  }

  const normalized = normalize(rawPath).replace(/^\.\//, "");
  if (!normalized.startsWith("data/")) {
    throw new Error('Local SQLite files must live under the "data/" directory.');
  }

  return join(process.cwd(), "data", normalized.slice("data/".length));
}

function seedSqliteAdmins(database) {
  const admins = getAdmins();
  const insert = database.prepare(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
     VALUES (lower(hex(randomblob(16))), ?, ?, 1, 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(email) DO UPDATE
     SET role = 'admin', "emailVerified" = 1, "updatedAt" = CURRENT_TIMESTAMP`
  );

  for (const admin of admins) {
    insert.run(admin.name, admin.email);
    console.log(`  ✓ admin: ${admin.email}`);
  }
}

async function seedPostgresAdmins(pool) {
  const admins = getAdmins();

  for (const admin of admins) {
    await pool.query(
      `INSERT INTO "user" (id, name, email, "emailVerified", role)
       VALUES (gen_random_uuid()::text, $1, $2, TRUE, 'admin')
       ON CONFLICT (email) DO UPDATE
       SET role = 'admin', "emailVerified" = TRUE`,
      [admin.name, admin.email]
    );
    console.log(`  ✓ admin: ${admin.email}`);
  }
}

function getAdmins() {
  return [
    { email: "1710269083@qq.com", name: "chk" },
    { email: "hophuctam8946@gmail.com", name: "Tam" },
  ];
}
