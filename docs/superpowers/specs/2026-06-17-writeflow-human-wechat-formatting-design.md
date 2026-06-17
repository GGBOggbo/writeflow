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

The mode is a general Writeflow public-account mode. Account-specific openings
such as a fixed Jintian intro must come from the current IP persona, account
template, or workflow context. They must not be hard-coded into every user's
article.

## Reader Experience

The formatted article should feel like a person guiding the reader through an
argument on a phone screen.

- Body font targets 15-17px in preview and WeChat-compatible output.
- Line height targets 1.6.
- Final article length targets 1000-1500 Chinese characters, with a hard upper
  bound of 1800 unless the user explicitly asks for a long article.
- Paragraphs use high-frequency line breaks. The default rhythm is one sentence
  or one core beat per paragraph.
- Two short sentences may stay together only when they clearly belong to the
  same emotional beat and read better as one breath.
- Dense paragraphs are split aggressively to create mobile breathing room.
- Paragraph rendering must apply justified text, 1.6 line height, and 1.6
  character left/right side inset in the managed preview and WeChat-copy output.
  If a non-WeChat target cannot support these controls, the limitation must be
  surfaced instead of treating the output as fully ready.
- The 1.6 side inset means left and right paragraph spacing. It is not a
  first-line text indent.
- Sections use two-digit Arabic anchors: `01`, `02`, `03`.
- The number stands on its own line, followed by a fully bold heading on the
  next line.
- Section heading text must be fully bolded from beginning to end.
- The article title must be bolded in preview/copy output when the title is
  included in the formatted article. It should not use a subtitle unless the
  user explicitly provides one.
- Bold inside the body is reserved for core judgments, high-energy lines, and
  scan anchors.
- The ending either uses the exact standalone line `写在最后的话：` followed by
  a strong closing line, or closes directly with a strong final judgment. It
  must not use `写在最后` without the colon format.
- The final closing line should be a screenshot-worthy sentence: concrete,
  memorable, and emotionally resonant.
- Covers are not generated in this scope, but prompts should favor clear,
  stable, real-looking cover directions over decorative design language when a
  cover prompt is involved later.

## Symbol Discipline

The final rendered article must not show cheap Markdown or AI-looking
decoration.

The default human-wechat rule is:

- do not use any double quotation marks in final public-article output,
  including straight quotes and Chinese curly quotes;
- forbid all horizontal divider lines and divider-like constructs, including
  but not limited to `---`, `___`, `***`, long dashes, repeated symbols, and
  visual separator rows;
- forbid decorative stars, emoji, ornamental symbols, and special-symbol
  framing;
- never show visible stars or Markdown syntax such as `**` in final HTML;
- keep punctuation clean and conversational.

Markdown stars may exist only as internal authoring syntax for bold. They must
be converted before preview/copy output.

This is a strict style rule for the final article. Source titles, dialogue,
concepts, and quoted claims should be transformed into narrative expression
instead of preserving double quotation marks. If an exact user-provided legal or
code fragment cannot be safely transformed, the formatter should fail validation
and ask for user confirmation rather than silently publishing a rule-breaking
article.

## Human Voice And Banlist

The highest writing principle is `说人话`: the article should sound like a real
person talking to a reader, with concrete scenes, emotions, actions, and
observable details.

The human-wechat mode must inherit the existing machine-word ban policy and
must be able to use the complete knowledge-base banlist as its canonical source.
The current baseline includes words and phrases such as `首先`, `其次`, `然而`,
`此外`, `综上所述`, `总之`, `因此`, `例如`, `基于此`, `显而易见`, `值得注意的是`,
`不可否认`, `换句话说`, `尽管如此`, `由此可见`, and `简而言之`.

Implementation must not hard-code only this shorter baseline if the 65-word
knowledge-base list is available. The full list should live in one reusable
policy source so prompts, validators, and tests use the same truth.

## Editorial Rhythm Model

New formatting should be guided by reading jobs rather than visual widgets.

The preferred rhythm vocabulary is:

- `开场`: name the conflict, pain, or promise quickly;
- `数字锚点`: structure the main argument with `01`, `02`, `03`;
- `短句推进`: move the reader forward with breathable paragraphs;
- `金句停顿`: bold a small number of high-value judgments;
- `证据 / 对比`: keep cases, examples, data, and contrast in normal prose unless
  a compact block clearly improves comprehension;
- `写在最后的话：`: close with a strong golden sentence that leaves a residue.

The old module vocabulary such as `hero`, `cards`, `metrics`, `verdict`, and
`cta` may remain supported by the parser and renderer for existing drafts. New
draft-formatting prompts should not frame the article as a collection of those
modules.

## Article Strategy Model

Human-wechat formatting is not only visual spacing. It should also surface the
business and trust structure already present in the source material.

For titles, when the workflow provides a title or title candidates, formatting
should prefer concrete public-account title patterns:

- identity plus result plus curiosity;
- numbers that make the pain or outcome specific;
- counterintuitive judgment;
- useful keywords such as AI, money, traffic, account growth, or workflow when
  they are truly relevant to the article.
- emotionally full, conflict-driven phrasing without a subtitle.

When the title is included in the formatted article, it must be fully bolded.

For openings, the strongest pattern is:

- credible identity;
- user pain;
- measurable or concrete result.

The opening should also include a real persona touch when available: personal
case, student case, observed scene, or a concrete moment that lets the reader
feel the writer has actually been there.

The AI may strengthen these elements only when they are present in the source,
material slots, persona template, search material, or known workflow context. It
must not invent experience counts, revenue, timelines, credentials, student
cases, or guaranteed outcomes.

For body sections, each major point should prefer this structure when the source
supports it:

- gripping subheading;
- real case or observed scene;
- principle or theory backing;
- practical method the reader can apply.

Cases, numbers, and methods should be promoted from source material, search
material, or user-provided context. They must not be fabricated for the sake of
looking like a high-conversion article.

Cases should be specific rather than decorative. Prefer details such as scene,
time, who acted, what changed, what the person felt, what number moved, or what
decision followed. Personal or student cases are preferred when the source
supports them.

For completion-rate guidance, the article may include a natural reader-retention
line only when it fits the content, such as telling the reader that the final
method or checklist is important. This should not become a repetitive template.

For endings, the preferred label is exactly `写在最后的话：`. The article may
also close directly with a strong final judgment when a label would feel stiff.
It must not use `写在最后` without the full colon format.

If the article has a business goal and source-supported call to action, the
ending may include a restrained conversion line such as follow, save, share,
comment, or private domain guidance. It must not create a new CTA that the user
did not imply.

Sharing or forwarding guidance should be included when the article has a
public-account growth goal and the source supports it. The final line should be
a strong golden sentence, not a generic summary.

When image support is part of the workflow, the article should prefer real
scene photos, screenshots, data screenshots, or other believable evidence
images over decorative illustrations.

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
7. Bold the title and every section heading fully when they appear in the
   formatted article.
8. Bold only a few core judgments or high-energy lines inside body prose.
9. Use the exact `写在最后的话：` label only when the source supports a real
   closing, or close directly with a strong final judgment.
10. Avoid decorative symbols, markdown dividers, visible markdown artifacts, and
   forced visual variety.
11. Avoid inventing new facts, cases, numbers, promises, positions, or calls to
    action.
12. Preserve protected material-slot tokens exactly once.
13. Promote source-supported identity, pain, result, cases, theory backing,
    practical methods, and CTA when the article already contains or implies
    them.
14. Apply the machine-word banlist and transform stiff logical connectors into
    questions, actions, scenes, or spoken transitions.

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
- support justified paragraph rendering and 1.6 character left/right side inset
  in managed preview and WeChat-copy HTML;
- avoid first-line indentation unless a future mode explicitly requires it;
- keep protected placeholders intact;
- validate advanced modules if the AI uses them;
- degrade invalid modules safely to ordinary Markdown;
- reject final output that contains double quotation marks, visible divider
  rows, visible Markdown stars, or banned machine words;
- log formatting mode, validation failures, retry reasons, final module names,
  and whether mobile preview validation passed.

Code should not:

- inject `hero`, `verdict`, `cta`, or summary modules after the AI returns;
- enforce a minimum module count;
- invent an ending, action, claim, or emotional conclusion;
- silently change user-provided factual claims to satisfy style rules.
- fabricate identity, measurable results, case data, or business CTAs.

## Compatibility

Existing drafts that contain old advanced modules must continue to preview and
copy correctly. This avoids breaking user history and keeps the migration small.

New human-wechat formatting should prefer plain Markdown structure over modules.
The old module list becomes a compatibility layer, not the product language.

If a future implementation introduces a new rhythm syntax, it should be added
behind the same mode boundary and should not be required for this first version.

## Failure Behavior

1. Validate the first AI result for placeholders, truncation, basic Markdown
   structure, module contracts, forbidden visible artifacts, machine-word
   banlist violations, length, title/heading bolding, ending format, and mobile
   reading parameters.
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
- high-frequency line breaks are preferred over dense multi-sentence blocks;
- `01` / bold heading rhythm survives Markdown-to-HTML rendering;
- title and section headings are fully bolded;
- visible Markdown stars do not appear in rendered HTML;
- generated prose avoids double quotation marks, decorative separators, visible
  stars, and ornamental symbols;
- all divider lines and divider-like constructs are rejected or cleaned;
- justified text and 1.6 left/right side inset are applied in managed preview
  and WeChat-copy HTML;
- the formatter does not confuse side inset with first-line indentation;
- final length targets 1000-1500 Chinese characters and rejects output above
  1800 unless explicitly requested;
- baseline machine words are rejected, and the implementation is ready to use
  the complete knowledge-base banlist;
- source-supported title, opening identity, cases, methods, and CTA are
  preserved or promoted;
- opening persona touch, concrete case details, completion guidance, real-image
  guidance, sharing guidance, and golden-sentence ending are used when
  source-supported;
- unsupported identity, results, cases, and CTA are not invented;
- protected placeholders are preserved exactly once;
- existing old modules still render;
- invalid old modules degrade safely;
- no automatic `hero`, `verdict`, or `cta` is injected;
- retry receives concrete validation feedback;
- fallback does not create new claims or modules.

## Preview Validation

The workflow must include a mobile preview check before the result is considered
ready. The check should verify reading density, title/heading bolding, line
break rhythm, visible Markdown artifacts, forbidden symbols, divider lines,
side inset, line height, and obvious overflow or spacing problems.

This can begin as deterministic HTML/CSS validation and should later be paired
with browser screenshot review for representative mobile widths.

## Out Of Scope

- building a full mode selector UI;
- deleting old module support;
- changing credit pricing;
- cover-image generation;
- WeChat editor clipboard automation;
- visual redesign of every old advanced module;
- rewriting the whole draft pipeline in one pass.
- hard-coding one creator's fixed intro into all users' articles.

## Acceptance Criteria

The feature is successful when a newly formatted draft:

- reads like a finished WeChat public-account article on mobile;
- uses high-frequency, breathable paragraphs without becoming fragmented;
- uses numbered anchors and restrained bolding when structure supports them;
- uses a bold title and fully bold section headings when present;
- avoids double quotation marks, visible Markdown artifacts, divider lines, and
  cheap decorative symbols;
- applies justified text and 1.6 left/right side inset in managed preview and
  WeChat-copy HTML;
- stays in the 1000-1500 character target range unless the user asks otherwise;
- promotes source-supported title, opening trust, cases, methods, and CTA;
- includes human voice, concrete case detail, sharing guidance, and a strong
  final golden sentence when the source supports them;
- refuses to invent unsupported identity, data, outcomes, cases, or conversion
  promises;
- preserves the user's factual content and point of view;
- still lets older module-based drafts preview and copy correctly.
