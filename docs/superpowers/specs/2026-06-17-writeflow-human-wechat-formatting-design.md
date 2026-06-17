# Writeflow Human WeChat Formatting Design

## Goal

Make Writeflow's default draft formatting feel like a finished WeChat public
account article, not a web component layout or a copied md2wechat module demo.

The product should optimize for mobile reading rhythm: clear opening tension,
short breathable paragraphs, numbered section anchors, restrained bold emphasis,
and a memorable closing. The system may keep the old advanced module renderer
for compatibility, but new AI-generated formatting should speak in Writeflow's
own editorial language.

## Product Position

The first mode is `human-wechat`, and it becomes the default formatting style.
The implementation should still leave a mode boundary so future modes such as
`professional-report` or `light-commercial` can be added without rewriting the
pipeline.

This first version does not expose a large mode selector. The visible user
promise remains simple: AI helps turn a draft into a clean, readable WeChat
article.

## Reader Experience

The formatted article should feel like a person guiding the reader through an
argument on a phone screen.

- Body font targets 15-17px in preview and WeChat-compatible output.
- Line height targets 1.6.
- Paragraphs use one core idea per paragraph. Two short sentences are allowed
  when they belong to the same emotional beat.
- Dense paragraphs are split aggressively, but mechanically splitting every
  sentence is forbidden.
- Sections use two-digit Arabic anchors: `01`, `02`, `03`.
- The number stands on its own line, followed by a fully bold heading on the
  next line.
- Bold is reserved for core judgments, high-energy lines, and scan anchors.
- The ending uses `写在最后` or `写在最后的话：` as a standalone line, followed
  by a concise closing judgment.
- Covers are not generated in this scope, but prompts should favor clear,
  stable, real-looking cover directions over decorative design language when a
  cover prompt is involved later.

## Symbol Discipline

The final rendered article must not show cheap Markdown or AI-looking
decoration.

The default human-wechat rule is:

- avoid double quotation marks in generated prose;
- avoid Markdown separators such as `---`;
- avoid decorative stars, emoji, ornamental dividers, and special-symbol
  framing;
- never leak Markdown syntax such as visible `**` into final HTML;
- keep punctuation clean and conversational.

This is a default style rule, not a legal or factual absolute. If a source
quote, title, regulation, code fragment, or user-provided exact text truly needs
quotation marks, the system may preserve it. Otherwise, the AI should transform
quoted claims into natural first-person or third-person phrasing.

## Editorial Rhythm Model

New formatting should be guided by reading jobs rather than visual widgets.

The preferred rhythm vocabulary is:

- `开场`: name the conflict, pain, or promise quickly;
- `数字锚点`: structure the main argument with `01`, `02`, `03`;
- `短句推进`: move the reader forward with breathable paragraphs;
- `金句停顿`: bold a small number of high-value judgments;
- `证据 / 对比`: keep cases, examples, data, and contrast in normal prose unless
  a compact block clearly improves comprehension;
- `写在最后`: close with a summary judgment that leaves a residue.

The old module vocabulary such as `hero`, `cards`, `metrics`, `verdict`, and
`cta` may remain supported by the parser and renderer for existing drafts. New
draft-formatting prompts should not frame the article as a collection of those
modules.

## Prompt Responsibilities

The draft-formatting prompt must instruct the AI to:

1. Read the source draft and identify the argument spine before formatting.
2. Preserve the user's position, examples, factual claims, and emotional
   direction.
3. Convert the draft into mobile-first WeChat prose with human-wechat rhythm.
4. Use `01` / `02` / `03` style anchors for major sections when the article has
   multiple logical parts.
5. Keep headings short, concrete, and fully bold.
6. Split dense paragraphs into breathable units without making the text choppy.
7. Bold only a few core judgments or high-energy lines.
8. Use `写在最后` or `写在最后的话：` only when the source supports a real closing.
9. Avoid decorative symbols, markdown dividers, visible markdown artifacts, and
   forced visual variety.
10. Avoid inventing new facts, cases, numbers, promises, positions, or calls to
    action.
11. Preserve protected material-slot tokens exactly once.

The prompt should describe the output as a finished WeChat article, not as a DSL
exercise. Advanced modules are allowed only when they serve a clear reading job
and are supported by source content.

## Rendering Responsibilities

Code should remain the conservative layer.

It should:

- preserve existing module parsing and rendering compatibility;
- render ordinary Markdown into clean WeChat-compatible HTML;
- ensure bold markers become HTML emphasis and never remain visible syntax;
- support the `01` plus bold heading rhythm without requiring a special module;
- keep protected placeholders intact;
- validate advanced modules if the AI uses them;
- degrade invalid modules safely to ordinary Markdown;
- log formatting mode, validation failures, retry reasons, and final module
  names.

Code should not:

- inject `hero`, `verdict`, `cta`, or summary modules after the AI returns;
- enforce a minimum module count;
- invent an ending, action, claim, or emotional conclusion;
- silently change user-provided factual claims to satisfy style rules.

## Compatibility

Existing drafts that contain old advanced modules must continue to preview and
copy correctly. This avoids breaking user history and keeps the migration small.

New human-wechat formatting should prefer plain Markdown structure over modules.
The old module list becomes a compatibility layer, not the product language.

If a future implementation introduces a new rhythm syntax, it should be added
behind the same mode boundary and should not be required for this first version.

## Failure Behavior

1. Validate the first AI result for placeholders, truncation, basic Markdown
   structure, module contracts, and forbidden visible artifacts.
2. Retry once with concrete validation feedback.
3. If both AI attempts fail, return a conservative local fallback.
4. The fallback may split paragraphs, preserve headings, and keep existing bold
   markers.
5. The fallback must not invent sections, endings, modules, examples, or
   conclusions.

## Testing

Tests should cover:

- default formatting mode is human-wechat;
- dense paragraphs are split without changing claims;
- `01` / bold heading rhythm survives Markdown-to-HTML rendering;
- visible Markdown stars do not appear in rendered HTML;
- generated prose avoids decorative separators and ornamental symbols;
- protected placeholders are preserved exactly once;
- existing old modules still render;
- invalid old modules degrade safely;
- no automatic `hero`, `verdict`, or `cta` is injected;
- retry receives concrete validation feedback;
- fallback does not create new claims or modules.

## Out Of Scope

- building a full mode selector UI;
- deleting old module support;
- changing credit pricing;
- cover-image generation;
- WeChat editor clipboard automation;
- visual redesign of every old advanced module;
- rewriting the whole draft pipeline in one pass.

## Acceptance Criteria

The feature is successful when a newly formatted draft:

- reads like a finished WeChat public-account article on mobile;
- uses short, breathable paragraphs without becoming fragmented;
- uses numbered anchors and restrained bolding when structure supports them;
- avoids visible Markdown artifacts and cheap decorative symbols;
- preserves the user's factual content and point of view;
- still lets older module-based drafts preview and copy correctly.
