# Pino Log Chain Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ad-hoc console logging with safe Pino JSON logs whose request, workflow, and billing-operation IDs remain correlated through JSON and streaming AI routes.

**Architecture:** A server-only Pino root logger reads request context from Node `AsyncLocalStorage` and applies fixed redaction. Existing `log.*` calls remain compatible through `lib/debug.ts`, while API wrappers and important AI/search boundaries emit stable structured events. The browser owns a persisted workflow UUID and sends it in a request header; the server owns the per-request UUID and confirms both IDs in response headers.

**Tech Stack:** Next.js 16 Route Handlers on Node.js runtime, TypeScript, Pino 10, pino-pretty 13, Node AsyncLocalStorage, Vitest.

---

### Task 1: Install Pino and build isolated logging primitives

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `lib/logging/context.ts`
- Create: `lib/logging/context.test.ts`
- Create: `lib/logging/logger.ts`
- Create: `lib/logging/logger.test.ts`
- Modify: `lib/debug.ts`

- [ ] Write failing tests for async context propagation, concurrent isolation, nested context extension, missing-context flags, JSON output, level filtering, and fixed redaction.
- [ ] Run `npm test -- lib/logging/context.test.ts lib/logging/logger.test.ts` and confirm failure because the modules do not exist.
- [ ] Install `pino` and `pino-pretty` with `npm install pino && npm install -D pino-pretty`.
- [ ] Implement `runWithLogContext`, `runWithExtendedLogContext`, and `getLogContext` using `AsyncLocalStorage<LogContext>` in a `server-only` module.
- [ ] Implement a singleton Pino logger with production JSON output, optional local pretty transport, fixed redaction paths, service/environment bindings, and context injection through `mixin`.
- [ ] Convert `lib/debug.ts` into a non-throwing compatibility adapter that writes `scope`, optional `event`, structured details, and safe error metadata through Pino.
- [ ] Run focused tests and lint until green.

### Task 2: Create and validate request chain context

**Files:**
- Create: `lib/logging/request-context.ts`
- Create: `lib/logging/request-context.test.ts`
- Modify: `app/api/ai/_shared.ts`
- Modify: `app/api/ai/_stream.ts`
- Modify: `app/api/ai/ai-routes.test.ts`

- [ ] Write failing tests for valid/invalid/missing `X-Workflow-Id`, generated `requestId`, `x-vercel-id`, HMAC user hash, response headers, and JSON/stream lifecycle correlation.
- [ ] Run focused tests and confirm the missing request-context behavior.
- [ ] Implement UUID validation, server-generated IDs, HMAC-SHA256 `userIdHash`, and one-time warning when production lacks `LOG_HASH_SECRET`.
- [ ] Wrap request parsing, auth, reserve, handler, consume/refund, response creation, and stream execution in the same context.
- [ ] Emit stable API and credit lifecycle events with status, stage, duration, and HTTP status; do not log request bodies or raw user IDs.
- [ ] Add `X-Request-Id` and confirmed `X-Workflow-Id` to JSON and streaming responses, including validation and auth errors.
- [ ] Run route/context tests and lint until green.

### Task 3: Persist and send the browser workflow ID

**Files:**
- Modify: `types/workflow.ts`
- Modify: `lib/state-machine.ts`
- Modify: `lib/state-machine.test.ts`
- Modify: `lib/storage/workflow-storage.ts`
- Modify: `lib/storage/workflow-storage.test.ts`
- Modify: `lib/ai/client.ts`
- Modify: `lib/ai/client.test.ts`
- Modify: `components/hooks/use-workflow.ts`
- Modify: `components/app-client.test.tsx`

- [ ] Write failing tests proving initial state gets a UUID, legacy storage is upgraded, refresh preserves it, reset changes it, all AI requests send it, and retries preserve it with the operation ID.
- [ ] Run focused state/storage/client/component tests and confirm failure.
- [ ] Add `workflowId` to `WorkflowState`, generate it in `createInitialWorkflowState`, and normalize absent/invalid legacy values.
- [ ] Change the internal browser request counter name to `uiRequestSequence` so it cannot be confused with server `requestId`.
- [ ] Extend `postJsonStream` and all public AI client methods with explicit workflow ID handling, request headers, and confirmed-response-ID callback.
- [ ] Pass `state.workflowId` from every workflow action and update state only when the server returns a different confirmed ID.
- [ ] Run focused tests and lint until green.

### Task 4: Remove sensitive AI debug payloads and add stable AI events

**Files:**
- Modify: `lib/ai/real-provider.ts`
- Modify: `lib/ai/real-provider.test.ts`
- Modify: `lib/ai/service.ts`
- Modify: `lib/ai/service.test.ts`

- [ ] Write failing tests that seed recognizable prompt/response secrets and assert logs contain character counts, model, attempt, duration, and stable events but not prompt or response text.
- [ ] Run focused AI tests and confirm current debug previews leak the seeded strings.
- [ ] Replace prompt/response previews with `systemPromptChars`, `userPromptChars`, `responseChars`, max tokens, attempt, provider/model, and safe parse-failure metadata.
- [ ] Convert topic-stage logs to stable events such as `search.plan.completed`, `search.context.prepared`, and `topics.generation.completed` while retaining current diagnostic fields.
- [ ] Run focused tests and lint until green.

### Task 5: Migrate search logs to stable events

**Files:**
- Modify: `lib/search/service.ts`
- Modify: `lib/search/wxrank-provider.ts`
- Modify: `lib/search/wxrank-provider.test.ts`
- Modify: `lib/search/generic-provider.ts`
- Modify: related search tests as required

- [ ] Write failing tests that assert stable event fields for provider start/completion, filtering, route selection, retained ranking, deep dive, article info, comments, and prepared context.
- [ ] Run focused search tests and confirm failure against legacy message-only logs.
- [ ] Migrate wxrank and generic provider logs to fixed event names with dynamic values in fields; retain all safe topic diagnostics added previously.
- [ ] Ensure no URL, article HTML, comment content, full provider response, or rejected title is logged.
- [ ] Run focused tests and lint until green.

### Task 6: Documentation, full verification, and commit

**Files:**
- Modify: `README.md`
- Create: `docs/logging.md`
- Modify local ignored planning records: `task_plan.md`, `findings.md`, `progress.md`

- [ ] Document `LOG_LEVEL`, `LOG_FORMAT`, optional `LOG_HASH_SECRET`, the three IDs, stable events, local pretty output, Vercel JSON queries, and future transport integration.
- [ ] Run `npm test` and require zero failures.
- [ ] Run ESLint on all touched source/test files and require zero errors.
- [ ] Run `npm run build` and require a successful Next.js production build.
- [ ] Scan tracked changes for secrets and leaked prompt/body/comment fixtures; only deliberate negative test fixtures may contain recognizable fake values.
- [ ] Confirm unrelated dirty auth/SQLite files remain unstaged.
- [ ] Commit feature files with `feat: add correlated pino logging`.

