/**
 * One-shot migration script — creates all required tables on Neon PostgreSQL.
 * Run with: npm run db:migrate
 */
import { Pool } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const pool = new Pool({ connectionString });

async function migrate() {
  console.log("Migrating database...");

  // ——————————————————————————————
  // better-auth tables (Kysely-compatible)
  // ——————————————————————————————
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

  // ——————————————————————————————
  // Application tables
  // ——————————————————————————————

  // Add role column to user table if it doesn't exist
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

  // Credit tables
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

  console.log("\nMigration complete!");

  // Set the existing admin users
  const admins = [
    { email: "1710269083@qq.com", name: "chk" },
    { email: "hophuctam8946@gmail.com", name: "Tam" },
  ];

  for (const admin of admins) {
    await pool.query(
      `INSERT INTO "user" (id, name, email, role)
       VALUES (gen_random_uuid()::text, $1, $2, 'admin')
       ON CONFLICT (email) DO UPDATE SET role = 'admin'`,
      [admin.name, admin.email]
    );
    console.log(`  ✓ admin: ${admin.email}`);
  }

  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
