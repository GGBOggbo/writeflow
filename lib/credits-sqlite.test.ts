import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import { CreditConflictError, InsufficientCreditsError } from "./credits";
import { SqliteCreditStore } from "./credits-sqlite";

describe("SqliteCreditStore", () => {
  let database: DatabaseSync;
  let store: SqliteCreditStore;

  beforeEach(() => {
    database = new DatabaseSync(":memory:");
    database.exec(`
      CREATE TABLE "user" (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL DEFAULT 'user'
      );
      INSERT INTO "user" (id, role) VALUES ('regular-user', 'user');
      INSERT INTO "user" (id, role) VALUES ('admin-user', 'admin');
    `);
    store = new SqliteCreditStore(database);
  });

  it("gives regular users five local credits", async () => {
    await expect(store.getBalance("regular-user")).resolves.toEqual({
      unlimited: false,
      remaining: 5,
    });
  });

  it("keeps administrators unlimited", async () => {
    await expect(store.reserve("admin-user", "topics", "op-1")).resolves.toEqual({
      unlimited: true,
      remaining: null,
    });
  });

  it("reserves, consumes, and refunds with SQLite transactions", async () => {
    await expect(store.reserve("regular-user", "draft", "op-1")).resolves.toEqual({
      unlimited: false,
      remaining: 4,
    });

    await expect(store.consume("regular-user", "op-1")).resolves.toEqual({
      unlimited: false,
      remaining: 4,
    });

    await expect(store.reserve("regular-user", "meta", "op-2")).resolves.toEqual({
      unlimited: false,
      remaining: 3,
    });
    await expect(store.refund("regular-user", "op-2")).resolves.toEqual({
      unlimited: false,
      remaining: 4,
    });
    await expect(store.refund("regular-user", "op-2")).resolves.toEqual({
      unlimited: false,
      remaining: 4,
    });
  });

  it("rejects duplicate pending or consumed operations", async () => {
    await store.reserve("regular-user", "topics", "op-1");

    await expect(store.reserve("regular-user", "topics", "op-1")).rejects.toThrow(
      CreditConflictError
    );

    await store.consume("regular-user", "op-1");

    await expect(store.reserve("regular-user", "topics", "op-1")).rejects.toThrow(
      CreditConflictError
    );
  });

  it("allows retrying the same refunded operation id for the same stage", async () => {
    await store.reserve("regular-user", "outline", "op-1");
    await store.refund("regular-user", "op-1");

    await expect(store.reserve("regular-user", "outline", "op-1")).resolves.toEqual({
      unlimited: false,
      remaining: 4,
    });
  });

  it("rejects new operations when local credits run out", async () => {
    for (let index = 0; index < 5; index += 1) {
      await store.reserve("regular-user", "brief", `op-${index}`);
      await store.consume("regular-user", `op-${index}`);
    }

    await expect(store.reserve("regular-user", "brief", "op-6")).rejects.toThrow(
      InsufficientCreditsError
    );
  });
});
