import { describe, expect, it } from "vitest";
import { getDatabaseConfig, parseSqlitePath } from "./database";

describe("database config", () => {
  it("defaults to postgres and requires DATABASE_URL", () => {
    expect(() => getDatabaseConfig({})).toThrow("DATABASE_URL is required");
  });

  it("reads postgres connection strings", () => {
    expect(
      getDatabaseConfig({
        DATABASE_PROVIDER: "postgres",
        DATABASE_URL: "postgresql://example",
      })
    ).toEqual({
      provider: "postgres",
      connectionString: "postgresql://example",
    });
  });

  it("reads sqlite file URLs", () => {
    const config = getDatabaseConfig({
      DATABASE_PROVIDER: "sqlite",
      DATABASE_URL: "file:./data/dev.sqlite",
    });

    expect(config.provider).toBe("sqlite");
    expect(config.path).toContain("/data/dev.sqlite");
  });

  it("accepts in-memory sqlite URLs for tests", () => {
    expect(parseSqlitePath(":memory:")).toBe(":memory:");
  });
});
