import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CreditConflictError,
  CreditStore,
  InsufficientCreditsError,
} from "./credits";

describe("CreditStore", () => {
  let db: Database.Database;
  let store: CreditStore;

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec(`
      CREATE TABLE user (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL DEFAULT 'user'
      );
      INSERT INTO user (id, role) VALUES
        ('regular-user', 'user'),
        ('admin-user', 'admin');
    `);
    store = new CreditStore(db);
  });

  afterEach(() => {
    db.close();
  });

  it("gives a regular user five initial credits", () => {
    expect(store.getBalance("regular-user")).toEqual({
      unlimited: false,
      remaining: 5,
    });
  });

  it("does not limit administrators", () => {
    expect(store.getBalance("admin-user")).toEqual({
      unlimited: true,
      remaining: null,
    });

    expect(
      store.reserve("admin-user", "topics", "admin-operation")
    ).toEqual({
      unlimited: true,
      remaining: null,
    });
  });

  it("atomically reserves one credit for a generation", () => {
    expect(
      store.reserve("regular-user", "topics", "operation-1")
    ).toEqual({
      unlimited: false,
      remaining: 4,
    });
    expect(store.getBalance("regular-user").remaining).toBe(4);
  });

  it("rejects a new operation when no credits remain", () => {
    for (let index = 0; index < 5; index += 1) {
      store.reserve("regular-user", "topics", `operation-${index}`);
      store.consume("regular-user", `operation-${index}`);
    }

    expect(() =>
      store.reserve("regular-user", "topics", "operation-6")
    ).toThrow(InsufficientCreditsError);
  });

  it("rejects a duplicate pending or consumed operation", () => {
    store.reserve("regular-user", "topics", "operation-1");

    expect(() =>
      store.reserve("regular-user", "topics", "operation-1")
    ).toThrow(CreditConflictError);

    store.consume("regular-user", "operation-1");

    expect(() =>
      store.reserve("regular-user", "topics", "operation-1")
    ).toThrow(CreditConflictError);
    expect(store.getBalance("regular-user").remaining).toBe(4);
  });

  it("rejects reusing an operation id for another stage", () => {
    store.reserve("regular-user", "topics", "operation-1");

    expect(() =>
      store.reserve("regular-user", "draft", "operation-1")
    ).toThrow(CreditConflictError);
  });

  it("refunds a failed operation exactly once", () => {
    store.reserve("regular-user", "draft", "operation-1");

    expect(store.refund("regular-user", "operation-1").remaining).toBe(5);
    expect(store.refund("regular-user", "operation-1").remaining).toBe(5);
  });

  it("allows a refunded operation to reserve again", () => {
    store.reserve("regular-user", "meta", "operation-1");
    store.refund("regular-user", "operation-1");

    expect(
      store.reserve("regular-user", "meta", "operation-1")
    ).toEqual({
      unlimited: false,
      remaining: 4,
    });
  });

  it("only consumes pending operations", () => {
    store.reserve("regular-user", "outline", "operation-1");

    expect(store.consume("regular-user", "operation-1").remaining).toBe(4);
    expect(() => store.consume("regular-user", "operation-1")).toThrow(
      CreditConflictError
    );
  });
});
