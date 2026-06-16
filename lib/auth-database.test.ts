import { describe, expect, it } from "vitest";
import { createAuthDatabase } from "./auth-database";

describe("auth database adapter", () => {
  it("wraps postgres connections in a Kysely database for Better Auth", () => {
    const database = createAuthDatabase({
      provider: "postgres",
      connectionString:
        "postgresql://user:password@example.neon.tech/neondb?sslmode=require",
    });

    if (!("type" in database)) {
      throw new Error("Expected postgres auth database");
    }
    expect(database.type).toBe("postgres");
    expect(database.db).toEqual(
      expect.objectContaining({
        insertInto: expect.any(Function),
        selectFrom: expect.any(Function),
      })
    );
  });
});
