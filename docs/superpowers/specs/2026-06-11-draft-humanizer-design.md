# Draft Humanizer Design

## Goal

Run a dedicated editorial rewrite after draft generation so the delivered article
removes common AI-writing patterns while preserving the user's facts, structure,
persona, material placeholders, and commercial conclusion.

## Product Rules

- Humanization applies only to generated body copy.
- Draft generation and humanization are one paid workflow and cost 1 credit total.
- Users only receive the humanized draft when the second model call succeeds.
- If humanization fails, the original draft is returned with a non-blocking notice.
- The humanizer must not invent facts, experiences, examples, data, or attribution.
- Material placeholders using `【💡需要你补充：...】` must remain byte-for-byte present.
- Draft IDs, labels, and draft count must not change during humanization.

## Architecture

The AI provider gains a focused `humanizeDrafts` operation. The real provider makes
a second model request using a condensed Chinese Humanizer editorial prompt. The
mock provider returns its drafts unchanged.

`generateDraft` remains the workflow owner:

1. summarize benchmark material when available;
2. generate the original draft;
3. emit a humanization progress event;
4. request an editorial rewrite;
5. validate draft identity and material placeholders;
6. return the rewritten draft, or fall back to the original draft on any failure.

The route-level credit wrapper remains unchanged. It reserves and consumes one
`draft` operation around the complete service call, so both model requests share
one credit.

## Humanizer Rules

The rewrite prompt condenses the local `humanizer-zh` skill into rules relevant to
Chinese public-account articles:

- remove filler openings, repetitive explanations, and generic positive endings;
- remove promotional language, inflated significance, and vague attribution;
- break formulaic contrasts, forced three-part lists, and overly symmetrical prose;
- reduce stock AI vocabulary, transition phrases, slogans, and quotable aphorisms;
- vary sentence and paragraph rhythm while keeping mobile-friendly short paragraphs;
- preserve uncertainty and direct judgments already supported by the source draft;
- never fabricate personal voice by inventing experiences or feelings.

The model returns the existing draft JSON structure and no review notes or scores.

## Failure Handling

Any model, parse, schema, identity, count, or placeholder-preservation failure is
treated as degraded humanization rather than failed draft generation. The service
returns the original draft with `humanizationStatus: "degraded"`. The client renders
the draft normally and shows a non-blocking notice that the original version was
kept.

## Progress

Draft progress adds one user-facing step, `去掉机器腔`, driven by
`draft_humanization_started` and `draft_humanization_completed`. Completion is
emitted for both successful rewrites and safe fallback so the progress UI does not
remain stuck.

## Testing

- Prompt tests prove the Humanizer rules and preservation constraints are sent.
- Service tests prove the second request replaces the original draft.
- Service tests prove failed humanization returns the original draft.
- Validation tests prove changed placeholders or draft identity trigger fallback.
- Component tests prove the extra progress step and degraded notice.
- Existing route tests prove one draft operation still consumes one credit.
