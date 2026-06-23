import { existsSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, join, normalize } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Pool } from "@neondatabase/serverless";

export type DatabaseProvider = "postgres" | "sqlite";

export type DatabaseConfig =
  | {
      provider: "postgres";
      connectionString: string;
    }
  | {
      provider: "sqlite";
      path: string;
    };

let sqliteDatabase: DatabaseSync | undefined;
let postgresPool: Pool | undefined;

export function getDatabaseConfig(env = process.env): DatabaseConfig {
  const provider = (env.DATABASE_PROVIDER || "postgres").toLowerCase();

  if (provider === "sqlite") {
    const path = parseSqlitePath(env.DATABASE_URL || "file:./data/dev.sqlite");
    return { provider: "sqlite", path };
  }

  if (provider !== "postgres") {
    throw new Error(
      `Unsupported DATABASE_PROVIDER "${provider}". Use "postgres" or "sqlite".`
    );
  }

  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for postgres.");
  }

  return {
    provider: "postgres",
    connectionString: normalizePostgresConnectionString(env.DATABASE_URL),
  };
}

function normalizePostgresConnectionString(connectionString: string) {
  if (/[?&]uselibpqcompat=true(?:&|#|$)/i.test(connectionString)) {
    return connectionString;
  }

  return connectionString.replace(
    /([?&]sslmode=)require(?=&|#|$)/i,
    "$1verify-full"
  );
}

export function parseSqlitePath(databaseUrl: string): string {
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

export function getSqliteDatabase() {
  const config = getDatabaseConfig();
  if (config.provider !== "sqlite") {
    throw new Error("SQLite database requested while DATABASE_PROVIDER is not sqlite.");
  }

  if (!sqliteDatabase) {
    ensureSqliteDirectory(config.path);
    sqliteDatabase = new DatabaseSync(config.path);
    sqliteDatabase.exec("PRAGMA foreign_keys = ON;");
  }

  return sqliteDatabase;
}

export function getPostgresPool() {
  const config = getDatabaseConfig();
  if (config.provider !== "postgres") {
    throw new Error("Postgres pool requested while DATABASE_PROVIDER is not postgres.");
  }

  if (!postgresPool) {
    postgresPool = new Pool({ connectionString: config.connectionString });
  }

  return postgresPool;
}

function ensureSqliteDirectory(path: string) {
  if (path === ":memory:") return;

  const directory = dirname(path);
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }
}
