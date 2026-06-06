# AI Writing MVP

This project is a local MVP for an AI-assisted Chinese long-form writing workflow.

Current scope:

- dual-panel writing UI
- workflow state machine
- `localStorage` persistence
- typed AI API routes
- `mock` provider as the fallback backend
- `openai` / `anthropic` provider placeholders for future integration
- `mimo` provider with a full real main-flow path:
  - `topics`
  - `brief`
  - `outline`
  - `draft`
  - `meta`
- search-enhanced generation design in progress:
  - `topics` default network enhancement
  - `meta` default network enhancement
  - `brief` / `outline` manual enhancement reserved
  - `draft` permanently offline by design

## Getting Started

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Copy the example file first:

```bash
cp .env.example .env.local
```

Supported provider values:

- `AI_PROVIDER=mock`
- `AI_PROVIDER=openai`
- `AI_PROVIDER=anthropic`
- `AI_PROVIDER=mimo`

Example variables:

```bash
AI_PROVIDER=mock

OPENAI_API_KEY=
OPENAI_MODEL=

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=

MIMO_API_KEY=
MIMO_MODEL=mimo-v2.5-pro
MIMO_BASE_URL=https://token-plan-cn.xiaomimimo.com/v1
```

## Provider Behavior

### Mock provider

`AI_PROVIDER=mock` remains the safe fallback. The current MVP should keep working exactly as before in this mode.

### Real provider placeholders

`openai` and `anthropic` are scaffolded, but not fully wired to real model calls yet.

- If `AI_PROVIDER=openai` and `OPENAI_API_KEY` is missing, the API returns a clear error.
- If `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY` is missing, the API returns a clear error.
- If keys are present, the provider still returns a clear "not implemented yet" message for now.

This keeps the frontend stable while the real integration pipeline is being prepared.

### Mimo provider

`mimo` is now the first fully wired real provider for the MVP main flow:

- `topics` is wired to Xiaomi MiMo's OpenAI-compatible `/chat/completions` endpoint
- `brief`, `outline`, `draft`, and `meta` are also wired through the same provider path
- missing `MIMO_API_KEY` returns a clear error
- `MIMO_BASE_URL` defaults to the China token-plan endpoint if omitted

## Search Enhancement

The current product rule for network search is:

- `Idea`: always offline
- `Topics`: online by default
- `Brief`: offline by default, manual enhancement reserved
- `Outline`: offline by default, manual enhancement reserved
- `Draft`: always offline
- `Meta`: online by default

Search is designed as a separate layer from model generation. Fresh search context is sanitized first, then passed into allowed prompts as references only.

Search failures must degrade gracefully and never block generation.

## Prompt Modules

Prompt builders now live in `lib/ai/prompts/`:

- `system.ts`
- `topics.ts`
- `brief.ts`
- `outline.ts`
- `draft.ts`
- `meta.ts`
- `edit.ts`

These modules align prompt inputs with the current typed contracts and Zod response schemas.

## Current Focus

The next implementation phase is:

1. complete the search service layer and provider abstraction
2. finish `topics` + `meta` network-enhanced generation
3. expose safe per-stage search controls in the UI
