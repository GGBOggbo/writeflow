# Search Keyword Evolution Backlog

## Current Decision

Users should only enter an idea. The product should not ask users to inspect,
edit, or confirm search keywords during the writing flow.

The current MVP keeps keyword generation invisible and automatic:

- Short ideas use lightweight rule-based core-term extraction.
- Long ideas prefer a three-part extraction shape: domain, audience, and pain.
- If semantic dictionary hits are too weak, the system falls back to generic
  core-term extraction and still appends `痛点`.
- `AI` is not forced into queries. It is only kept when the user's idea is
  already AI-related.

## Deferred Requirement

The keyword dictionaries should become easier to evolve after real usage, but
this is not part of the first release.

Future options:

- Use an AI "需求调研专家" workflow to periodically propose new domain,
  audience, and pain terms from observed weak searches.
- Use WeChat search suggestion APIs to discover current long-tail demand terms.
- Use article comments from benchmark articles to identify high-frequency user
  pain expressions.
- Maintain the dictionary as product-owned configuration rather than asking end
  users to edit keywords.

## Non-Goals For MVP

- No keyword editing UI.
- No extra user action before search.
- No automatic hot update of keyword dictionaries.
- No mandatory logging review workflow.

## Trigger To Revisit

Revisit this backlog when search results repeatedly miss the user's intended
domain, or when we add a dedicated search-suggestion/comment-mining pipeline.
