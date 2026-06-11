# Credit Metering Design

## Goal

Replace the single completed-workflow quota with a secure credit balance. A regular
user starts with 5 credits, and each successful AI generation costs 1 credit.

## Product Rules

- Regular users receive 5 credits. Administrators have unlimited credits.
- Topics, brief, outline, draft, and meta each cost 1 credit per generation.
- Regeneration is a new paid operation.
- A failed generation does not cost a credit.
- A retry of the same operation does not charge twice.
- Both streaming and non-streaming AI routes enforce the same rules.
- The UI shows the remaining balance and blocks obvious requests when empty.
- The server remains authoritative even if the client is modified.

## Architecture

`workflow_credit_accounts` stores the current balance. `workflow_credit_operations`
stores one row per generation operation with a unique `(userId, operationId)` key,
the AI stage, cost, and status.

Before model execution, the server runs one SQLite transaction that:

1. authenticates the user;
2. returns unlimited access for administrators;
3. finds or creates the user's account with 5 credits;
4. recognizes an existing operation as an idempotent retry;
5. checks the balance;
6. deducts 1 credit and records a pending operation.

After successful generation, the pending operation becomes `consumed`. If generation
throws, another transaction marks it `refunded` and restores the credit exactly once.

Every client generation creates one UUID `operationId`. The same UUID is retained for
transport-level retries. A deliberate regeneration creates a new UUID and costs
another credit.

## API Contract

All AI requests include `operationId`. Streaming and non-streaming handlers call the
same credit reservation API before invoking the AI service.

Responses expose the post-operation balance:

- Streaming responses send a `credits` payload before the final result.
- Non-streaming responses include an `X-Credits-Remaining` header.
- A small authenticated `GET /api/credits` endpoint returns the current balance for
  initial UI rendering and refreshes.

Insufficient credit returns HTTP 403 with a Chinese user-facing message. Invalid or
reused operation IDs with a different stage return HTTP 409.

## Security Properties

- Balance check and deduction are atomic in SQLite.
- A unique database constraint prevents duplicate charges.
- Operation ownership and stage are checked on every request.
- Client-supplied balances and roles are never trusted.
- Direct non-streaming API calls cannot bypass charging.
- Refunds are state-conditional and therefore cannot be applied twice.

## Testing

Unit tests cover initial balances, administrator access, atomic deduction, insufficient
balance, idempotent retries, stage mismatch, success finalization, and one-time refunds.
Route tests cover streaming and non-streaming charging, failures, and response balance.
UI tests cover balance display and disabled generation controls.

