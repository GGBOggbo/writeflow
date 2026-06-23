import { describe, expect, it } from "vitest";
import { getDatabaseConfig, parseSqlitePath } from "./database";

describe("database config", () => {
  it("defaults to postgres and requires DATABASE_URL", () => {
    expect(() => getDatabaseConfig({ NODE_ENV: "test" })).toThrow(
      "DATABASE_URL is required"
    );
  });

  it("reads postgres connection strings", () => {
    expect(
      getDatabaseConfig({
        NODE_ENV: "test",
        DATABASE_PROVIDER: "postgres",
        DATABASE_URL: "postgresql://example",
      })
    ).toEqual({
      provider: "postgres",
      connectionString: "postgresql://example",
    });
  });

  it("makes legacy sslmode=require semantics explicit", () => {
    expect(
      getDatabaseConfig({
        NODE_ENV: "test",
        DATABASE_PROVIDER: "postgres",
        DATABASE_URL:
          "postgresql://user:password@example.com/database?sslmode=require",
      })
    ).toEqual({
      provider: "postgres",
      connectionString:
        "postgresql://user:password@example.com/database?sslmode=verify-full",
    });
  });

  it("reads sqlite file URLs", () => {
    const config = getDatabaseConfig({
      NODE_ENV: "test",
      DATABASE_PROVIDER: "sqlite",
      DATABASE_URL: "file:./data/dev.sqlite",
    });

    expect(config.provider).toBe("sqlite");
    if (config.provider !== "sqlite") {
      throw new Error("Expected sqlite config");
    }
    expect(config.path).toContain("/data/dev.sqlite");
  });

  it("accepts in-memory sqlite URLs for tests", () => {
    expect(parseSqlitePath(":memory:")).toBe(":memory:");
  });
});
