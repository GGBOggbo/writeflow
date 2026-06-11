# Credit Metering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give regular users 5 credits and atomically charge 1 credit for every successful AI generation without duplicate charges on retries.

**Architecture:** A focused SQLite credit service owns accounts and idempotent operations. Shared streaming and JSON route wrappers reserve, consume, or refund credits around AI execution, while the client supplies operation UUIDs and reads the authoritative balance.

**Tech Stack:** Next.js 16 Route Handlers, TypeScript, better-sqlite3, Zod, React 19, Vitest

---

### Task 1: Credit Domain Service

**Files:**
- Replace: `lib/usage.ts`
- Create: `lib/credits.test.ts`

- [x] Write failing tests for initial 5-credit accounts, atomic reservation, insufficient balance, administrator access, idempotent retry, stage mismatch, consume, and one-time refund.
- [x] Run `npm test -- lib/credits.test.ts` and verify failures describe the missing credit API.
- [x] Implement balance lookup, reservation, consumption, and refund with SQLite transactions and unique operation IDs.
- [x] Run `npm test -- lib/credits.test.ts` and verify all domain tests pass.

### Task 2: Shared Route Metering

**Files:**
- Modify: `app/api/ai/_stream.ts`
- Modify: `app/api/ai/_shared.ts`
- Modify: `app/api/ai/ai-routes.test.ts`
- Modify: all ten AI route files under `app/api/ai/{topics,brief,outline,draft,meta}`

- [x] Add failing route tests proving successful requests charge and thrown generation refunds.
- [x] Run the focused route tests and verify they fail for the expected missing behavior.
- [x] Add a shared JSON response wrapper and update the stream wrapper to reserve before generation, consume after success, refund on failure, and report remaining credits.
- [x] Configure each route with its explicit stage and remove the old meta-only counting behavior.
- [x] Run the focused route tests and verify they pass.

### Task 3: Request Contract and Client Idempotency

**Files:**
- Modify: `types/ai.ts`
- Modify: `lib/ai/schemas.ts`
- Modify: `lib/ai/schemas.test.ts`
- Modify: `lib/ai/client.ts`
- Modify: `components/hooks/use-workflow.ts`

- [x] Add failing schema tests requiring a UUID operation ID for every generation.
- [x] Run the focused tests and verify the contract is not yet implemented.
- [x] Add `operationId` to all HTTP request schemas and create one UUID per user-triggered generation.
- [x] Preserve the UUID for explicit retry of the same failed action; create a fresh UUID for deliberate regeneration.
- [x] Run the focused tests and verify they pass.

### Task 4: Balance Endpoint and UI

**Files:**
- Create: `app/api/credits/route.ts`
- Create: `app/api/credits/route.test.ts`
- Modify: `components/hooks/use-workflow.ts`
- Modify: `components/workflow-context.tsx`
- Modify: `components/workspace-shell.tsx`
- Modify: stage components containing generation buttons
- Modify: relevant component tests

- [x] Add failing endpoint and component tests for displaying 5 credits and disabling generation at zero.
- [x] Run the focused tests and verify they fail for the expected missing UI/API behavior.
- [x] Implement the authenticated balance endpoint and client balance state.
- [x] Display the balance in the workspace header and disable paid actions when the finite balance is zero.
- [x] Run the focused endpoint and component tests and verify they pass.

### Task 5: Regression Verification

**Files:**
- Modify only files required by failures directly caused by Tasks 1-4.

- [x] Run `npm test`.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.
- [x] Inspect `git diff --check` and the final diff for unrelated changes.
- [x] Confirm direct streaming and non-streaming requests share the same charging path.
