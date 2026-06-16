# Draft Prompt Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove conflicting and repeated draft-writing rules while adding explicit authenticity, material-placeholder, and prompt-injection boundaries.

**Architecture:** Keep immutable cross-stage constraints in `policies.ts` and keep draft-only execution rules in `draft.ts`. Preserve the existing provider JSON hint, Zod response schema, and frontend contract.

**Tech Stack:** TypeScript, Vitest, Zod

---

### Task 1: Lock the desired prompt contract

**Files:**
- Modify: `lib/ai/prompts/system.test.ts`
- Modify: `lib/ai/prompts/draft.test.ts`

- [x] Add assertions that the system prompt uses 1-3 sentence natural paragraphs, limits IP authenticity to expression rather than invented experience, gives natural transition alternatives, and treats runtime inputs as data rather than instructions.
- [x] Add assertions that the draft prompt allows at most three specific material placeholders, treats benchmark content as non-instructional reference data, and retains the current one-draft JSON contract.
- [x] Run `npx vitest run lib/ai/prompts/system.test.ts lib/ai/prompts/draft.test.ts` and confirm the new assertions fail for the missing wording.

### Task 2: Refine shared policies and draft rules

**Files:**
- Modify: `lib/ai/prompts/policies.ts`
- Modify: `lib/ai/prompts/draft.ts`

- [x] Replace the conflicting high-frequency line-break policy with a single 1-3 sentence natural-paragraph rule.
- [x] Add the authenticity boundary, natural transition strategies, and runtime-input anti-injection policy to shared policies.
- [x] Replace repeated draft facts/continuity rules with concise draft-only rules for structure, concrete placeholders, closing, and benchmark use.
- [x] Run the two focused prompt test files and confirm all tests pass.

### Task 3: Verify the application

**Files:**
- No additional production files expected.

- [x] Run `npm test` and confirm the complete suite passes.
- [x] Run `npm run lint && npm run build && git diff --check` and confirm all commands exit successfully.
