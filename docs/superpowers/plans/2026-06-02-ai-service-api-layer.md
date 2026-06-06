# AI Service API Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the frontend's direct mock generator dependency with a typed AI service/provider layer and Next.js API routes while keeping the current UI and workflow unchanged.

**Architecture:** Mock generation logic moves behind a provider interface on the server side. Next.js route handlers validate request and response payloads, and the frontend calls a client-side API wrapper instead of importing mock generators directly.

**Tech Stack:** Next.js App Router, React, TypeScript, Zod, Vitest, Testing Library

---

## Current Status Update

- Completed:
  - typed provider / service / API layering
  - mock provider default path
  - frontend switched to API-backed calls
  - provider selection via `AI_PROVIDER`
  - placeholder `openai` / `anthropic` provider scaffolding
  - first `mimo topics` real-provider path via OpenAI-compatible endpoint
  - prompt module file structure under `lib/ai/prompts/`
- Next milestone:
  - validate real `mimo topics` output quality with live credentials
  - implement the next real model call for `brief`
  - keep other stages on mock or explicit placeholder errors until they are ready

---

### Task 1: Define shared AI request and response contracts

**Files:**
- Create: `types/ai.ts`
- Create: `lib/ai/schemas.ts`
- Test: `lib/ai/schemas.test.ts`

- [ ] **Step 1: Write a failing schema validation test**
- [ ] **Step 2: Run the test to verify RED**
- [ ] **Step 3: Add typed contracts and matching Zod schemas for topics, brief, outline, draft, and meta generation**
- [ ] **Step 4: Re-run the test to verify GREEN**

### Task 2: Move mock generation behind a provider/service layer

**Files:**
- Create: `lib/ai/provider.ts`
- Create: `lib/ai/mock-provider.ts`
- Create: `lib/ai/service.ts`
- Modify: `lib/mock/generators.ts` or replace usage so frontend no longer imports it
- Test: `lib/ai/service.test.ts`

- [ ] **Step 1: Write a failing service test**
- [ ] **Step 2: Run the test to verify RED**
- [ ] **Step 3: Implement a provider interface with methods `generateTopics`, `generateBrief`, `generateOutline`, `generateDraft`, and `generateTitlesAndSummaries`**
- [ ] **Step 4: Re-run the test to verify GREEN**

### Task 3: Add API routes on top of the service layer

**Files:**
- Create: `app/api/ai/topics/route.ts`
- Create: `app/api/ai/brief/route.ts`
- Create: `app/api/ai/outline/route.ts`
- Create: `app/api/ai/draft/route.ts`
- Create: `app/api/ai/meta/route.ts`
- Test: `app/api/ai/ai-routes.test.ts`

- [ ] **Step 1: Write a failing API route test**
- [ ] **Step 2: Run the test to verify RED**
- [ ] **Step 3: Implement route handlers with request parsing, Zod validation, and structured JSON responses**
- [ ] **Step 4: Re-run the test to verify GREEN**

### Task 4: Switch the frontend client to API-backed calls

**Files:**
- Create: `lib/ai/client.ts`
- Modify: `components/app-client.tsx`
- Test: `components/app-client.test.tsx`

- [ ] **Step 1: Write or update a failing client flow test**
- [ ] **Step 2: Run the test to verify RED**
- [ ] **Step 3: Replace direct mock imports with API client calls and keep existing loading/error handling plus localStorage persistence**
- [ ] **Step 4: Re-run the test to verify GREEN**

### Task 5: Final verification

**Files:**
- Modify: any touched files as needed for cleanup

- [ ] **Step 1: Run the focused test suite**
- [ ] **Step 2: Run the full test suite**
- [ ] **Step 3: Run lint and build**
- [ ] **Step 4: Reload the local app and verify the end-to-end mock workflow still runs through the API routes**
