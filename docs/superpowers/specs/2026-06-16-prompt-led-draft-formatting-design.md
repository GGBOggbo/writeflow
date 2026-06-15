# Prompt-Led Draft Formatting Design

## Goal

Simplify draft formatting so the AI editor owns article rhythm and module
selection, while application code only protects content integrity, validates
syntax, and renders the accepted Markdown.

The formatting action is editorial, not byte-for-byte typesetting. It may
extract existing judgments into concise module copy, tighten headings, split
paragraphs, and add short connective wording, but it must not introduce new
facts, cases, data, promises, positions, or calls to action.

## Product Behavior

- Keep one explicit free action in the draft editor: `AI 编辑排版（免费）`.
- The current draft remains available; formatting creates a separate
  `排版版`.
- The AI returns complete GFM Markdown and may use supported `:::` modules.
- The AI chooses modules by reading task, not by satisfying a fixed count.
- Ordinary paragraphs remain the default. A module must help the reader
  recognize a judgment, method, comparison, warning, summary, or action.
- Preview remains a deterministic local Markdown-to-HTML render.
- Formatting does not consume credits.

## Prompt Responsibilities

The prompt must instruct the AI to:

1. Identify the article skeleton before choosing modules.
2. Preserve the original voice, examples, argument, and emotional direction.
3. Keep the opening conversational; do not automatically turn it into a hero
   or quote card.
4. Use body text for emotion and modules for concise editorial summaries.
5. Select modules according to reading task, not visual variety.
6. Avoid invented data or implied quantified outcomes.
7. Use no module when the source does not support one.
8. Preserve protected material-slot tokens exactly once.

The prompt may allow:

- paragraph splitting and merging;
- stronger, shorter section headings;
- extracting an existing sentence into a module field;
- light connective wording that does not add a new claim;
- limited local reordering when it does not change the argument.

## Code Responsibilities

Code keeps:

- protected material-slot token handling;
- source-module preservation;
- invalid source-module degradation to ordinary Markdown;
- GFM structure validation;
- advanced-module contract validation;
- content-fidelity validation;
- provider retry with concrete validation feedback;
- truncation detection;
- deterministic HTML rendering and WeChat compatibility conversion;
- diagnostics for source, attempts, validation failures, and selected modules.

Code removes:

- automatic `verdict` generation;
- automatic `cta` generation;
- automatic first-screen `quote` generation;
- regex-based judgment or action extraction used only for those insertions;
- any fixed minimum module count enforced after AI output.

## Failure Behavior

1. Validate the first AI result.
2. On failure, retry once from the original normalized draft and include the
   concrete validation reason.
3. If both AI attempts fail, return a conservative local Markdown fallback.
4. The fallback may promote existing standalone headings and add Markdown
   emphasis required for a readable document.
5. The fallback must not create `:::` modules, invent summary copy, or turn
   sentences into new judgments or calls to action.

## Validation Boundary

Editorial formatting is allowed to change presentation and concise phrasing,
but validation must continue to reject:

- missing source material;
- changed protected placeholders;
- changed or silently removed existing valid modules;
- illegal or incomplete modules;
- unsupported fields;
- newly invented factual claims;
- truncated output.

Existing similarity thresholds remain unchanged in this scoped simplification.
They can be tuned separately using real rejected outputs rather than loosened
speculatively.

## Testing

Tests must prove:

- a valid AI result with no advanced modules remains module-free;
- a valid AI-selected module is preserved;
- no first-screen quote is injected;
- no ending verdict or CTA is injected;
- local fallback contains no advanced modules;
- invalid source modules still degrade safely;
- placeholder, contract, retry, and truncation protections continue to work;
- service logs report actual AI-selected module names only.

## Out Of Scope

- theme switching;
- renderer visual redesign;
- a second strict typesetting mode;
- credit changes;
- changing the draft-generation prompt;
- lowering fidelity thresholds without production evidence.
