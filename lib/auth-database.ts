import { Kysely, PostgresDialect } from "kysely";
import { Pool as PgPool } from "pg";
import { getSqliteDatabase, type DatabaseConfig } from "./database";

let authPostgresDatabase: Kysely<unknown> | undefined;

export function createAuthDatabase(config: DatabaseConfig) {
  if (config.provider === "sqlite") {
    return getSqliteDatabase();
  }

  if (!authPostgresDatabase) {
    authPostgresDatabase = new Kysely({
      dialect: new PostgresDialect({
        pool: new PgPool({
          connectionString: config.connectionString,
        }),
      }),
    });
  }

  return {
    db: authPostgresDatabase,
    type: "postgres" as const,
  };
}
