# First-Free Regeneration Credits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change Writeflow product credits so each `userId + workflowId + stage` gets one free successful generation, while successful regenerations cost `0.05` credit.

**Architecture:** The credit layer remains the single source of truth. Stores persist integer credit units (`1 credit = 100 units`), route wrappers pass the server-confirmed `workflowId` into reservations, and the client stops treating zero balance as a universal blocker. Free formatting/material routes stay outside the credit store.

**Tech Stack:** Next.js 16 App Router route handlers, Vitest, React 19, Postgres via `@neondatabase/serverless`, local SQLite via `node:sqlite`, existing request log context.

---

## Relevant Next.js note

The local Next.js 16 docs were checked before this plan. `app/api/**/route.ts` files are Route Handlers using Web `Request`/`Response` APIs, and POST handlers are not cached by default. Keep the current wrapper pattern using `Request`, `NextResponse.json`, and `new Response(stream, headers)`.

## File structure

- Modify `lib/credits-core.ts` — shared unit constants, display conversion, and the new insufficient-credit message.
- Modify `lib/credits.ts` — Postgres schema safety, `workflowId` storage, first-free/regeneration reservation logic, display balance conversion.
- Modify `lib/credits-sqlite.ts` — SQLite equivalent of the Postgres credit logic.
- Modify `lib/credits.test.ts` — Postgres store tests using the existing fake pool.
- Modify `lib/credits-sqlite.test.ts` — SQLite integration-style tests for units, workflow dimensions, refunds, and idempotency.
- Modify `app/api/ai/_shared.ts` and `app/api/ai/_stream.ts` — pass confirmed `workflowId` to `creditStore.reserve`.
- Modify `app/api/ai/ai-routes.test.ts` — assert `workflowId` propagation and decimal balances.
- Modify `scripts/migrate.mjs` — add one-time migration marker, `workflowId` column, and unit conversion for both databases.
- Modify `components/hooks/use-workflow.ts` — stop zero balance from disabling first-generation actions.
- Modify `components/workspace-shell.tsx`, `components/help-onboarding.tsx`, and stage components/tests — update copy from “每次 1 积分 / 积分不足” to the new rule.
- Modify `README.md` and `docs/api-cost-ledger.md` — update product credit documentation.

## Task 1: Credit core constants and display conversion

**Files:**
- Modify: `lib/credits-core.ts`

- [ ] **Step 1: Write the failing core expectations**

Add these assertions inside existing credit store tests rather than creating a new file, so both stores reuse the same constants:

```ts
import {
  CREDIT_UNITS_PER_CREDIT,
  creditUnitsToAmount,
  INITIAL_CREDITS,
  REGENERATION_CREDIT_COST_UNITS,
} from "./credits";

it("uses fixed credit units for display balances", () => {
  expect(CREDIT_UNITS_PER_CREDIT).toBe(100);
  expect(INITIAL_CREDITS).toBe(500);
  expect(REGENERATION_CREDIT_COST_UNITS).toBe(5);
  expect(creditUnitsToAmount(500)).toBe(5);
  expect(creditUnitsToAmount(495)).toBe(4.95);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npx vitest run lib/credits.test.ts lib/credits-sqlite.test.ts
```

Expected: FAIL because the new constants/functions do not exist and current balances are still `5`, not `500` units internally.

- [ ] **Step 3: Replace `lib/credits-core.ts` constants with unit-aware exports**

Use this exact shape:

```ts
export const CREDIT_UNITS_PER_CREDIT = 100;
export const INITIAL_CREDIT_AMOUNT = 5;
export const INITIAL_CREDITS = INITIAL_CREDIT_AMOUNT * CREDIT_UNITS_PER_CREDIT;
export const FREE_GENERATION_CREDIT_COST_UNITS = 0;
export const REGENERATION_CREDIT_COST_UNITS = 5;
export const CREDIT_COST_PER_GENERATION = REGENERATION_CREDIT_COST_UNITS;

export function creditUnitsToAmount(units: number) {
  return units / CREDIT_UNITS_PER_CREDIT;
}
```

Keep `AI_STAGES`, `AiStage`, and `CreditConflictError` unchanged. Change `InsufficientCreditsError` to:

```ts
export class InsufficientCreditsError extends Error {
  constructor() {
    super("重新生成需要至少 0.05 积分。");
    this.name = "InsufficientCreditsError";
  }
}
```

- [ ] **Step 4: Re-export the new helpers from `lib/credits.ts`**

Add these names to the existing import/export list:

```ts
CREDIT_UNITS_PER_CREDIT,
FREE_GENERATION_CREDIT_COST_UNITS,
REGENERATION_CREDIT_COST_UNITS,
creditUnitsToAmount,
```

- [ ] **Step 5: Run the focused tests**

Run:

```bash
npx vitest run lib/credits.test.ts lib/credits-sqlite.test.ts
```

Expected: tests still fail on store behavior, but constant import failures are gone.

- [ ] **Step 6: Commit**

```bash
git add lib/credits-core.ts lib/credits.ts lib/credits.test.ts
git commit -m "feat: define fixed credit units"
```

## Task 2: Implement first-free credit logic in both stores

**Files:**
- Modify: `lib/credits.ts`
- Modify: `lib/credits-sqlite.ts`
- Modify: `lib/credits.test.ts`
- Modify: `lib/credits-sqlite.test.ts`

- [ ] **Step 1: Update store method signatures in tests**

All `reserve` calls for regular users must include a fourth `workflowId` argument:

```ts
await store.reserve("regular-user", "topics", "operation-1", "workflow-a");
```

Admin tests should also pass a workflow ID:

```ts
await store.reserve("admin-user", "topics", "admin-operation", "workflow-a");
```

- [ ] **Step 2: Add behavior tests to both store test files**

Add these cases to `lib/credits-sqlite.test.ts`; mirror the same assertions in `lib/credits.test.ts` after extending the fake pool:

```ts
it("makes the first successful generation in a workflow stage free", async () => {
  await expect(
    store.reserve("regular-user", "topics", "op-1", "workflow-a")
  ).resolves.toEqual({ unlimited: false, remaining: 5 });

  await expect(store.consume("regular-user", "op-1")).resolves.toEqual({
    unlimited: false,
    remaining: 5,
  });
});

it("charges 0.05 credits for regenerating the same workflow stage", async () => {
  await store.reserve("regular-user", "topics", "op-1", "workflow-a");
  await store.consume("regular-user", "op-1");

  await expect(
    store.reserve("regular-user", "topics", "op-2", "workflow-a")
  ).resolves.toEqual({ unlimited: false, remaining: 4.95 });

  await expect(store.consume("regular-user", "op-2")).resolves.toEqual({
    unlimited: false,
    remaining: 4.95,
  });
});

it("keeps different stages and workflows free for their first success", async () => {
  await store.reserve("regular-user", "topics", "op-1", "workflow-a");
  await store.consume("regular-user", "op-1");

  await expect(
    store.reserve("regular-user", "brief", "op-2", "workflow-a")
  ).resolves.toEqual({ unlimited: false, remaining: 5 });

  await expect(
    store.reserve("regular-user", "topics", "op-3", "workflow-b")
  ).resolves.toEqual({ unlimited: false, remaining: 5 });
});

it("lets a zero-balance user run a first free generation but rejects regeneration", async () => {
  await store.reserve("regular-user", "topics", "op-1", "workflow-a");
  await store.consume("regular-user", "op-1");

  database
    .prepare('UPDATE workflow_credit_accounts SET balance = 0 WHERE "userId" = ?')
    .run("regular-user");

  await expect(
    store.reserve("regular-user", "brief", "op-2", "workflow-a")
  ).resolves.toEqual({ unlimited: false, remaining: 0 });

  await expect(
    store.reserve("regular-user", "topics", "op-3", "workflow-a")
  ).rejects.toThrow(InsufficientCreditsError);
});

it("refunds only the reserved regeneration cost and reuses a refunded operation id", async () => {
  await store.reserve("regular-user", "draft", "op-1", "workflow-a");
  await store.consume("regular-user", "op-1");
  await store.reserve("regular-user", "draft", "op-2", "workflow-a");

  await expect(store.refund("regular-user", "op-2")).resolves.toEqual({
    unlimited: false,
    remaining: 5,
  });

  await expect(
    store.reserve("regular-user", "draft", "op-2", "workflow-a")
  ).resolves.toEqual({ unlimited: false, remaining: 4.95 });
});

it("rejects concurrent generation for the same workflow stage", async () => {
  await store.reserve("regular-user", "outline", "op-1", "workflow-a");

  await expect(
    store.reserve("regular-user", "outline", "op-2", "workflow-a")
  ).rejects.toThrow(CreditConflictError);
});
```

In the fake-pool version, expose a helper such as `setBalance(userId: string, balance: number)` instead of directly using SQLite.

- [ ] **Step 3: Run tests and verify failures**

Run:

```bash
npx vitest run lib/credits.test.ts lib/credits-sqlite.test.ts
```

Expected: FAIL because stores still reserve one whole credit, do not accept `workflowId`, and do not convert unit balances to display amounts.

- [ ] **Step 4: Implement Postgres schema safety**

In `lib/credits.ts`, update the imports and `CreditOperationRow`:

```ts
type CreditOperationRow = {
  stage: AiStage;
  status: "pending" | "consumed" | "refunded";
  cost: number;
  workflowId: string | null;
};
```

Replace `ensureTables()` SQL with a block that creates a meta table, uses unit defaults, adds `workflowId`, and runs one idempotent conversion:

```sql
CREATE TABLE IF NOT EXISTS workflow_schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_credit_accounts (
  "userId" TEXT PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 500 CHECK (balance >= 0),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_credit_operations (
  "userId" TEXT NOT NULL,
  "operationId" TEXT NOT NULL,
  "workflowId" TEXT,
  stage TEXT NOT NULL,
  cost INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL CHECK (status IN ('pending', 'consumed', 'refunded')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("userId", "operationId")
);

ALTER TABLE workflow_credit_operations
  ADD COLUMN IF NOT EXISTS "workflowId" TEXT;
ALTER TABLE workflow_credit_accounts
  ALTER COLUMN balance SET DEFAULT 500;
ALTER TABLE workflow_credit_operations
  ALTER COLUMN cost SET DEFAULT 5;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM workflow_schema_meta WHERE key = 'credit-units-v1'
  ) THEN
    UPDATE workflow_credit_accounts SET balance = balance * 100;
    UPDATE workflow_credit_operations SET cost = cost * 100;
    INSERT INTO workflow_schema_meta (key, value, "updatedAt")
    VALUES ('credit-units-v1', 'applied', NOW())
    ON CONFLICT (key) DO NOTHING;
  END IF;
END $$;
```

- [ ] **Step 5: Implement Postgres display balance and reserve logic**

Change `getRegularBalance()` to convert units:

```ts
return {
  unlimited: false,
  remaining: creditUnitsToAmount(result.rows[0].balance),
};
```

Change the signature:

```ts
async reserve(
  userId: string,
  stage: AiStage,
  operationId: string,
  workflowId: string
): Promise<CreditBalance>
```

Inside the transaction, lock the account, reject another pending operation in the same dimension, reuse refunded operation costs, and only deduct when `cost > 0`:

```ts
await client.query(
  `SELECT balance FROM workflow_credit_accounts WHERE "userId" = $1 FOR UPDATE`,
  [userId]
);

const existing = await client.query(
  `SELECT stage, status, cost, "workflowId"
   FROM workflow_credit_operations
   WHERE "userId" = $1 AND "operationId" = $2
   FOR UPDATE`,
  [userId, operationId]
);
```

For a new operation:

```ts
const pending = await client.query(
  `SELECT 1 FROM workflow_credit_operations
   WHERE "userId" = $1 AND "workflowId" = $2 AND stage = $3 AND status = 'pending'
   LIMIT 1`,
  [userId, workflowId, stage]
);
if (pending.rowCount > 0) {
  throw new CreditConflictError("该步骤已有生成请求正在进行。");
}

const consumed = await client.query(
  `SELECT 1 FROM workflow_credit_operations
   WHERE "userId" = $1 AND "workflowId" = $2 AND stage = $3 AND status = 'consumed'
   LIMIT 1`,
  [userId, workflowId, stage]
);
const cost = consumed.rowCount > 0 ? REGENERATION_CREDIT_COST_UNITS : FREE_GENERATION_CREDIT_COST_UNITS;

await client.query(
  `INSERT INTO workflow_credit_operations
    ("userId", "operationId", "workflowId", stage, cost, status, "createdAt", "updatedAt")
   VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW())`,
  [userId, operationId, workflowId, stage, cost]
);
```

For an existing refunded operation:

```ts
if (row.stage !== stage || row.workflowId !== workflowId) {
  throw new CreditConflictError("该请求标识已被其他生成步骤使用。");
}
if (row.status !== "refunded") {
  throw new CreditConflictError();
}
await client.query(
  `UPDATE workflow_credit_operations
   SET status = 'pending', "updatedAt" = NOW()
   WHERE "userId" = $1 AND "operationId" = $2 AND status = 'refunded'`,
  [userId, operationId]
);
const cost = row.cost;
```

Deduct only paid regenerations:

```ts
if (cost > 0) {
  const deduction = await client.query(
    `UPDATE workflow_credit_accounts
     SET balance = balance - $1, "updatedAt" = NOW()
     WHERE "userId" = $2 AND balance >= $1
     RETURNING balance`,
    [cost, userId]
  );
  if (deduction.rowCount !== 1) throw new InsufficientCreditsError();
}

return this.getRegularBalance(userId, client);
```

- [ ] **Step 6: Implement SQLite schema and reserve logic with the same semantics**

In `lib/credits-sqlite.ts`, add `workflow_schema_meta`, create credit tables with `500`/`5`, add `workflowId` when missing:

```ts
const columns = this.database
  .prepare("PRAGMA table_info(workflow_credit_operations)")
  .all() as Array<{ name: string }>;
if (!columns.some((column) => column.name === "workflowId")) {
  this.database.exec('ALTER TABLE workflow_credit_operations ADD COLUMN "workflowId" TEXT;');
}
```

Run the one-time unit conversion:

```ts
const marker = this.database
  .prepare("SELECT value FROM workflow_schema_meta WHERE key = ?")
  .get("credit-units-v1");
if (!marker) {
  this.database.exec(`
    UPDATE workflow_credit_accounts SET balance = balance * 100;
    UPDATE workflow_credit_operations SET cost = cost * 100;
    INSERT INTO workflow_schema_meta (key, value, "updatedAt")
    VALUES ('credit-units-v1', 'applied', CURRENT_TIMESTAMP);
  `);
}
```

Mirror the Postgres reservation algorithm using `BEGIN IMMEDIATE`, `SELECT ... status = 'pending'`, `SELECT ... status = 'consumed'`, cost `0` or `5`, and `UPDATE workflow_credit_accounts SET balance = balance - ? WHERE balance >= ?` only when `cost > 0`.

- [ ] **Step 7: Extend the fake Postgres pool**

Update the fake operation map in `lib/credits.test.ts` to store:

```ts
{ stage: string; cost: number; status: string; workflowId: string | null }
```

Add query branches for:

```sql
SELECT 1 FROM workflow_credit_operations ... status = 'pending'
SELECT 1 FROM workflow_credit_operations ... status = 'consumed'
SELECT stage, status, cost, "workflowId" FROM workflow_credit_operations ...
```

Add a helper:

```ts
setBalance(userId: string, balance: number) {
  this.accounts.set(userId, balance);
}
```

- [ ] **Step 8: Run store tests**

Run:

```bash
npx vitest run lib/credits.test.ts lib/credits-sqlite.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/credits.ts lib/credits-sqlite.ts lib/credits.test.ts lib/credits-sqlite.test.ts
git commit -m "feat: charge credits only for regeneration"
```

## Task 3: Pass workflowId through metered AI routes

**Files:**
- Modify: `app/api/ai/_shared.ts`
- Modify: `app/api/ai/_stream.ts`
- Modify: `app/api/ai/ai-routes.test.ts`

- [ ] **Step 1: Update route tests**

Change existing expectations:

```ts
expect(creditMocks.reserve).toHaveBeenCalledWith(
  "test-user",
  "topics",
  operationId,
  workflowId
);
```

For the omitted-header test, assert generated UUID propagation:

```ts
const confirmedWorkflowId = response.headers.get("X-Workflow-Id");
expect(confirmedWorkflowId).toMatch(/[0-9a-f-]{36}/);
expect(creditMocks.reserve).toHaveBeenCalledWith(
  "test-user",
  "topics",
  operationId,
  confirmedWorkflowId
);
```

Set mock balances to decimals:

```ts
creditMocks.reserve.mockReset().mockResolvedValue({ unlimited: false, remaining: 5 });
creditMocks.consume.mockReset().mockResolvedValue({ unlimited: false, remaining: 4.95 });
```

- [ ] **Step 2: Run API tests and verify failures**

Run:

```bash
npx vitest run app/api/ai/ai-routes.test.ts
```

Expected: FAIL because wrappers still call `reserve(userId, stage, operationId)`.

- [ ] **Step 3: Update both wrappers**

In `meteredJsonResponse` and `streamJsonResponse`, read the confirmed workflow id after `withRequestLogContext` has created context:

```ts
const workflowId = getLogContext()?.workflowId;
if (!workflowId) {
  return serverErrorResponse(new Error("缺少工作流标识。"));
}
```

Call reserve with the fourth argument:

```ts
await creditStore.reserve(userId, stage, input.operationId, workflowId);
```

Keep `consume(userId, operationId)` and `refund(userId, operationId)` unchanged because operation IDs remain unique per user.

- [ ] **Step 4: Run API tests**

Run:

```bash
npx vitest run app/api/ai/ai-routes.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/ai/_shared.ts app/api/ai/_stream.ts app/api/ai/ai-routes.test.ts
git commit -m "feat: meter ai credits by workflow"
```

## Task 4: Add explicit migration coverage

**Files:**
- Modify: `scripts/migrate.mjs`
- Create: `scripts/migrate.test.ts` only if the project already supports script tests cleanly; otherwise cover migration behavior through SQLite store tests.

- [ ] **Step 1: Add SQLite migration assertions to `lib/credits-sqlite.test.ts`**

Create an old-shape database before constructing the store:

```ts
it("migrates legacy integer credits to fixed units exactly once", async () => {
  const legacy = new DatabaseSync(":memory:");
  legacy.exec(`
    CREATE TABLE "user" (id TEXT PRIMARY KEY, role TEXT NOT NULL DEFAULT 'user');
    INSERT INTO "user" (id, role) VALUES ('regular-user', 'user');
    CREATE TABLE workflow_credit_accounts (
      "userId" TEXT PRIMARY KEY,
      balance INTEGER NOT NULL DEFAULT 5 CHECK (balance >= 0),
      "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE workflow_credit_operations (
      "userId" TEXT NOT NULL,
      "operationId" TEXT NOT NULL,
      stage TEXT NOT NULL,
      cost INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL CHECK (status IN ('pending', 'consumed', 'refunded')),
      "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("userId", "operationId")
    );
    INSERT INTO workflow_credit_accounts ("userId", balance) VALUES ('regular-user', 5);
    INSERT INTO workflow_credit_operations ("userId", "operationId", stage, cost, status)
    VALUES ('regular-user', 'legacy-op', 'topics', 1, 'consumed');
  `);

  const legacyStore = new SqliteCreditStore(legacy);
  await expect(legacyStore.getBalance("regular-user")).resolves.toEqual({
    unlimited: false,
    remaining: 5,
  });
  await expect(legacyStore.getBalance("regular-user")).resolves.toEqual({
    unlimited: false,
    remaining: 5,
  });

  const account = legacy
    .prepare('SELECT balance FROM workflow_credit_accounts WHERE "userId" = ?')
    .get("regular-user") as { balance: number };
  const operation = legacy
    .prepare('SELECT cost, "workflowId" FROM workflow_credit_operations WHERE "operationId" = ?')
    .get("legacy-op") as { cost: number; workflowId: string | null };

  expect(account.balance).toBe(500);
  expect(operation.cost).toBe(100);
  expect(operation.workflowId).toBeNull();
});
```

- [ ] **Step 2: Update `scripts/migrate.mjs` schema**

For SQLite and Postgres, add `workflow_schema_meta`, set new table defaults to `500` and `5`, include `"workflowId" TEXT` in `workflow_credit_operations`, and run the same one-time conversion marker used by runtime stores.

Use marker key:

```text
credit-units-v1
```

- [ ] **Step 3: Run migration-related tests**

Run:

```bash
npx vitest run lib/credits-sqlite.test.ts
DATABASE_PROVIDER=sqlite DATABASE_URL=:memory: npm run db:migrate
```

Expected: Vitest passes and migrate script completes.

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate.mjs lib/credits-sqlite.test.ts
git commit -m "feat: migrate credit balances to units"
```

## Task 5: Update frontend zero-balance behavior and copy

**Files:**
- Modify: `components/hooks/use-workflow.ts`
- Modify: `components/workspace-shell.tsx`
- Modify: `components/workspace-shell.test.tsx`
- Modify: `components/help-onboarding.tsx`
- Modify: `components/stages/idea-stage.tsx`
- Modify: `components/stages/topic-stage.tsx`
- Modify: `components/stages/brief-stage.tsx`
- Modify: `components/stages/outline-stage.tsx`
- Modify: `components/stages/draft-stage.tsx`

- [ ] **Step 1: Update shell tests**

Replace the old zero-balance expectation with:

```ts
it("does not treat zero balance as a universal generation blocker", () => {
  render(
    <WorkflowProvider initialCreditBalance={{ unlimited: false, remaining: 0 }}>
      <WorkspaceShell />
    </WorkflowProvider>
  );

  expect(screen.getByText("每阶段首次免费，重新生成扣 0.05 积分")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /生成选题方向/i })).not.toBeDisabled();
});
```

Update the balance-card copy assertion:

```ts
expect(screen.getByText("每阶段首次免费，重新生成扣 0.05 积分")).toBeInTheDocument();
```

- [ ] **Step 2: Run frontend focused tests and verify failure**

Run:

```bash
npx vitest run components/workspace-shell.test.tsx components/stages/topic-stage.test.tsx components/stages/outline-stage.test.tsx components/stages/draft-stage.test.tsx
```

Expected: FAIL because `canGenerate` is false at zero balance and copy still says `1 积分`.

- [ ] **Step 3: Allow first-generation clicks at zero balance**

In `components/hooks/use-workflow.ts`, replace `canGenerate` with:

```ts
const canGenerate = creditBalance === null || creditBalance.unlimited || creditBalance.remaining >= 0;
```

This deliberately makes `canGenerate` a transport/login readiness flag, not a billing decision. Server-side credit reservation remains authoritative and blocks paid regeneration when balance is below `0.05`.

- [ ] **Step 4: Update credit card display**

In `components/workspace-shell.tsx`, remove red zero-balance styling as the default “bad” state. Use:

```ts
const creditValue = creditBalance?.unlimited
  ? "∞"
  : creditBalance?.remaining ?? "—";
```

Set the badge and caption:

```tsx
<span className="mb-1 rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold">
  {creditBalance?.unlimited ? "无限" : "可用"}
</span>
...
{creditBalance?.unlimited
  ? "管理员生成不消耗积分"
  : "每阶段首次免费，重新生成扣 0.05 积分"}
```

Set `aria-label` for non-admin users to:

```ts
`剩余 ${creditValue} 积分，每阶段首次免费`
```

- [ ] **Step 5: Update stage button fallback labels**

For metered stages, replace `"积分不足"` button text with a server-truth-oriented label:

```tsx
"余额不足时会提示"
```

Only use that fallback where the current code already branches on `canGenerate`; most users should now see the normal generation label even at `0`.

- [ ] **Step 6: Update onboarding copy**

In `components/help-onboarding.tsx`, replace the credit explanation body with:

```ts
body: "右上角这张卡显示当前项目积分。每个阶段首次生成免费；对同一阶段重新生成会扣 0.05 积分。AI 排版和补充素材不消耗积分。",
```

- [ ] **Step 7: Run frontend tests**

Run:

```bash
npx vitest run components/workspace-shell.test.tsx components/stages/topic-stage.test.tsx components/stages/outline-stage.test.tsx components/stages/draft-stage.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/hooks/use-workflow.ts components/workspace-shell.tsx components/workspace-shell.test.tsx components/help-onboarding.tsx components/stages/idea-stage.tsx components/stages/topic-stage.tsx components/stages/brief-stage.tsx components/stages/outline-stage.tsx components/stages/draft-stage.tsx
git commit -m "feat: allow first free generation at zero balance"
```

## Task 6: Update docs and product copy

**Files:**
- Modify: `README.md`
- Modify: `docs/api-cost-ledger.md`
- Modify: `components/landing-page.tsx`
- Modify: `components/landing-page.test.tsx` if present; otherwise rely on app tests.

- [ ] **Step 1: Search stale copy**

Run:

```bash
rg -n "每次生成消耗 1|消耗 1 积分|再次扣除 1|1 项目积分|每次成功返回会消耗 1" README.md docs components app lib
```

Expected: stale live docs/UI copy is listed. Old dated specs under `docs/superpowers/specs` and old implementation plans may remain historical records unless they are linked from current product docs.

- [ ] **Step 2: Update current docs**

Replace current product-credit copy with:

```md
项目积分是产品内生成额度，不等于人民币成本。`topics`、`brief`、`outline`、`draft`、`meta` 五个阶段按 `userId + workflowId + stage` 计费：每个阶段首次成功生成免费，同一工作流同一阶段重新生成成功后扣 0.05 项目积分。AI 排版和 AI 补充素材免费；失败请求退款；系统内部自动重试不额外扣费。
```

In `docs/api-cost-ledger.md`, keep wxrank real-cost table separate from this product-credit paragraph.

- [ ] **Step 3: Update landing copy**

In `components/landing-page.tsx`, replace:

```ts
desc: "按阶段计费，每次生成消耗 1 积分。失败自动退还，搜索规划不额外扣费。",
```

with:

```ts
desc: "每阶段首次生成免费，同一阶段重新生成扣 0.05 积分。失败自动退还，搜索规划不额外扣费。",
```

Replace FAQ answer with:

```ts
a: "注册即送 5 项目积分。选题、Brief、大纲、正文、标题摘要这五个阶段首次生成免费；同一工作流同一阶段重新生成成功后扣 0.05 积分。AI 排版和补充素材不消耗积分。额度用完后可联系管理员充值。",
```

- [ ] **Step 4: Verify stale live copy is gone**

Run:

```bash
rg -n "每次生成消耗 1|消耗 1 积分|再次扣除 1|每次成功返回会消耗 1" README.md docs/api-cost-ledger.md components app lib
```

Expected: no output from live docs/components.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/api-cost-ledger.md components/landing-page.tsx
git commit -m "docs: update first-free credit policy"
```

## Task 7: Full verification

**Files:**
- No code changes expected.

- [ ] **Step 1: Run targeted tests**

Run:

```bash
npx vitest run lib/credits.test.ts lib/credits-sqlite.test.ts app/api/ai/ai-routes.test.ts app/api/credits/route.test.ts components/workspace-shell.test.tsx components/stages/topic-stage.test.tsx components/stages/outline-stage.test.tsx components/stages/draft-stage.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run the full test suite**

Run:

```bash
npm test
```

Expected: PASS, with only existing skipped tests.

- [ ] **Step 3: Run diff whitespace check**

Run:

```bash
git diff --check
```

Expected: no output.

- [ ] **Step 4: Inspect final diff**

Run:

```bash
git status --short
git diff --stat
```

Expected: only files listed in this plan are changed.

- [ ] **Step 5: Final commit if verification required edits**

If verification required fixes, commit them:

```bash
git add .
git commit -m "test: verify first-free credit policy"
```

If no files changed after Task 6, do not create an empty commit.

## Self-review

- Spec coverage: first free per `userId + workflowId + stage` is covered in Task 2; regeneration `0.05` is covered in Tasks 1–2; zero-balance first generation is covered in Tasks 2 and 5; failed request refund and retry idempotency are covered in Task 2; free formatting/material routes are protected by existing API tests in Task 3; docs/copy updates are covered in Task 6.
- Migration coverage: Task 4 covers one-time unit migration, `workflowId` column, and legacy `workflowId = NULL`.
- Type consistency: `reserve(userId, stage, operationId, workflowId)` is introduced in stores and propagated through AI route wrappers; `consume` and `refund` signatures remain unchanged.
- Risk handling: concurrent same-dimension requests are rejected while one operation is pending, avoiding two simultaneous free generations.
