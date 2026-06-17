# Writeflow Human WeChat Formatting Design

## Goal

Make Writeflow's formatted preview and WeChat-copy output look like a clean,
mobile-first WeChat public account article.

This spec is about formatting only. It must not change the article's meaning,
strategy, title promise, author identity, cases, data, call to action, or
argument. Writing quality rules such as title formulas, human voice, case
strengthening, and growth CTAs belong to drafting or editing specs, not this
formatting spec.

The system must also stop looking like a 1:1 copy of another formatter. The
shared idea of Markdown containers is acceptable; copied module names, field
semantics, HTML structure, class names, and visual styling are not.

Open Design may be used as a design reference, especially its token discipline,
editorial restraint, component contracts, and clear anti-patterns. It must not
be copied as a visual implementation. Writeflow's WeChat HTML has stricter
constraints than a web app: the copied result must survive being pasted into the
WeChat public account editor.

## Scope

The formatter owns presentation:

- Markdown-to-HTML conversion;
- AI-produced module syntax as the intermediate layout contract;
- WeChat-compatible inline styles;
- mobile reading density;
- paragraph spacing and line breaks;
- heading and emphasis rendering;
- removal or neutralization of visible formatting artifacts;
- compatibility with existing advanced modules.

The formatter does not own content:

- no rewriting titles;
- no adding identity, credentials, or opening hooks;
- no adding cases, examples, data, screenshots, or theory backing;
- no adding `写在最后的话：`;
- no adding follow, share, private-domain, or purchase CTAs;
- no removing user-provided claims because they sound less polished;
- no transforming quotation marks or wording when that would change the text.

If the source article already contains those elements, the formatter may render
them clearly. It must not invent them.

## Product Position

The first formatting mode is `human-wechat`, and it becomes the default preview
and copy style for public-account drafts.

The implementation should still keep a mode boundary so future modes such as
`professional-report` or `light-commercial` can be added without rewriting the
renderer.

This first version does not expose a large mode selector. The visible user
promise remains simple: make the current draft easier to read and copy into
WeChat.

## Formatting Rules

The managed preview and WeChat-copy HTML should target:

- body font size: 15-17px;
- line height: 1.6;
- text alignment: justified;
- paragraph left and right side inset: 1.6 characters where HTML/CSS can express
  it;
- no first-line indentation by default;
- high-frequency paragraph breaks when the input already has paragraph or
  sentence boundaries that can be safely represented as layout;
- title bolding when the title is included in the formatted article;
- `01`, `02`, `03` style numeric anchors on their own line when the source
  already uses that structure;
- section headings fully bolded from beginning to end;
- body bolding rendered as emphasis, with no visible Markdown stars;
- enough vertical spacing between paragraphs to create mobile breathing room.

The 1.6 side inset means left and right paragraph spacing. It is not first-line
indentation.

## Content Preservation

Formatting may change layout, not substance.

Allowed changes:

- converting Markdown emphasis to HTML emphasis;
- converting Markdown headings to styled text;
- converting supported advanced modules to deterministic HTML;
- wrapping existing content in supported advanced modules when that module only
  changes presentation;
- normalizing paragraph wrappers, spacing, and inline styles;
- splitting an existing dense paragraph only at safe punctuation boundaries when
  the sentences remain unchanged and in the same order;
- removing visible Markdown syntax from rendered HTML;
- degrading invalid advanced modules to ordinary readable Markdown/HTML.

Forbidden changes:

- rewriting sentences for stronger hooks or better voice;
- changing title wording;
- deleting quotes, claims, examples, numbers, identities, or CTAs from the
  article text;
- adding missing examples, cases, CTAs, endings, headings, or arguments;
- translating the author's tone into another style;
- changing source order to make a better article.

If a writing-level rule conflicts with content preservation, content
preservation wins in this formatter. The issue should be reported as an editing
suggestion, not silently fixed by formatting.

## Artifact Rules

The final rendered output must not expose formatting artifacts:

- no visible `**` or Markdown emphasis markers;
- no visible unsupported module fences;
- no broken placeholder tokens;
- no raw HTML that the user did not write intentionally;
- no malformed copied HTML.

Horizontal divider lines are treated as layout artifacts when they are Markdown
or repeated-symbol dividers. The formatter may remove or restyle them as spacing
only when doing so does not remove meaningful user text.

Double quotation marks are not a formatting artifact. If the source article
contains quotation marks, this formatter preserves them. Removing or transforming
them belongs to a separate editing or humanization pass.

## Advanced Module Compatibility

Advanced modules are the contract between AI layout orchestration and HTML
rendering.

The AI formatting step may output a mix of ordinary Markdown and supported
module fences. The parser turns that into article nodes, and the HTML renderer
turns those nodes into WeChat-compatible output.

Existing drafts that contain advanced modules must continue to preview and copy
correctly. This protects user history and keeps the rendering pipeline stable.

The key boundary is content preservation. A module may re-present content that
already exists in the article, but it must not become a way to add missing
claims, examples, endings, CTAs, identities, numbers, or conclusions.

Code should not inject `hero`, `verdict`, `cta`, or summary modules after the AI
returns. The AI may select supported modules during the formatting step, then
code validates and renders the result.

## Module Syntax Boundary

The formatter uses module syntax as its layout AST, but the product language
must become Writeflow's own.

The fence form can stay because it is a generic Markdown container pattern:

```md
:::module-name
field: value
:::
```

The module namespace must change.

- New AI formatting output should use Writeflow-owned module names.
- Writeflow-owned names should use a clear namespace such as `wf-*`.
- Legacy names such as `hero`, `cards`, `metrics`, `verdict`, and `cta` remain
  readable for old drafts, but they should not be the prompt language for new
  formatting.
- The code module definitions remain the source of truth, but they need to grow
  a new Writeflow module vocabulary rather than freezing the borrowed one.

Initial Writeflow module vocabulary should be small and reading-rhythm focused:

| Module | Purpose |
| --- | --- |
| `wf-lead` | Render an existing opening block or lead judgment. |
| `wf-section` | Render an existing section transition, index, and heading. |
| `wf-pullquote` | Render an existing high-value sentence as a pause. |
| `wf-points` | Render existing parallel points or reasons. |
| `wf-steps` | Render existing ordered steps or checklist items. |
| `wf-note` | Render an existing warning, reminder, or side note. |
| `wf-compare` | Render an existing contrast or before/after comparison. |
| `wf-image-note` | Render an existing image with caption or explanation. |

This vocabulary is intentionally smaller than the legacy list. It describes
reading jobs, not web page components.

The AI formatting step may introduce supported `:::` module fences when the
source content already contains material that fits the module. Examples:

- an existing strong sentence may become `wf-pullquote`;
- an existing numbered section transition may become `wf-section`;
- existing parallel options may become `wf-points`;
- existing ordered actions may become `wf-steps`;
- existing images and their explanations may become `wf-image-note`.

Module fields must be traceable to source content. If a field needs compact
wording, it may be a faithful extraction or light compression of existing text,
but it must not introduce a new claim.

The formatter must not create a new rhythm DSL. In particular, it should not
generate blocks such as:

```md
::opening
...
::

::section
...
::
```

For new formatted output, the preferred structure is ordinary Markdown:

```md
**文章标题**

01

**小标题**

正文段落。

**已有重点句。**
```

Ordinary Markdown remains valid output. Modules are optional layout tools, not a
quota.

If the source or AI-formatted result contains a valid advanced module, render
it. If it contains an invalid or unsupported module, degrade it safely or ask
the AI to retry with validation feedback.

Legacy modules should be treated as an input compatibility layer:

- old drafts render through legacy definitions;
- new AI prompts do not ask for legacy module names;
- copied legacy HTML structures should be replaced with Writeflow-owned
  renderers over time;
- legacy-to-Writeflow migration can be gradual and should not break saved
  drafts.

## HTML Style Originality

The WeChat-copy HTML must have Writeflow-owned visual decisions.

Renderer output should avoid copied:

- class names;
- `data-*` naming schemes;
- nested section/div structures;
- inline style recipes;
- visual card proportions;
- border/accent treatments;
- module-specific HTML layouts.

Writeflow renderers should use their own stable attributes, for example
`data-writeflow-module`, `data-writeflow-version`, and
`data-writeflow-role`, rather than inherited third-party naming.

Open Design reference should be translated into WeChat-safe principles:

- use token discipline, not ad-hoc colors;
- use typography and spacing first;
- use one quiet accent family rather than many decorative colors;
- use subtle section rhythm instead of web-card density;
- use minimal borders and background blocks;
- avoid hover, animation, pseudo-elements, glass effects, paper noise,
  external fonts, and complex layout tricks;
- keep every visible decision expressible as WeChat-safe inline CSS.

The initial Writeflow editorial token direction should be inspired by
Open Design's warm/editorial systems but adapted for this product:

| Role | Direction |
| --- | --- |
| Text | warm near-black, optimized for long mobile reading. |
| Muted text | warm gray-brown for captions and small labels. |
| Accent | restrained brown/terracotta for section marks and pullquote lines. |
| Border | very light warm neutral, used sparingly. |
| Surface | mostly transparent or very light warm paper blocks. |

Exact hex values belong in renderer tokens and tests. They should be
Writeflow-owned values, not a direct copy of an Open Design palette.

The goal is not novelty for its own sake. It is a distinct implementation and
visual language that serves the same public-account reading task without copying
another project's module system or renderer structure.

## WeChat Copy HTML Contract

The preview may contain extra diagnostic attributes for development, but the
copy payload must work after paste into the WeChat editor.

The copy HTML must:

- use inline `style` attributes for all required visual styling;
- avoid relying on classes, CSS variables, external stylesheets, style tags,
  scripts, pseudo-elements, hover states, media queries, or custom fonts;
- avoid CSS Grid, complex flex layouts, fixed/absolute positioning, z-index
  choreography, filters, blend modes, animations, transforms, and unsupported
  modern CSS functions such as `color-mix`;
- use conservative tags such as `section`, `p`, `span`, `strong`, `em`, `img`,
  `a`, `ul`, `ol`, `li`, `blockquote`, and simple table-like structures only
  when necessary;
- keep images as normal inline content with safe width and height rules;
- keep module blocks self-contained so the WeChat editor can preserve spacing
  even if it strips nonessential attributes;
- escape user text and never pass through raw untrusted HTML;
- produce a plain article fragment, not a full HTML document.

Preview-only attributes such as `data-writeflow-module` may exist in local
preview HTML, but the copied article must not depend on them for layout or
appearance. If WeChat strips those attributes, the article should still look
correct because the visual contract lives in inline styles.

Verification must include both:

- deterministic sanitizer checks for forbidden tags, attributes, and CSS
  features;
- browser-based paste/copy verification using representative article samples,
  including long paragraphs, headings, `wf-*` modules, images, lists, and
  legacy modules.

## Prompt Boundary

If an AI formatting prompt is used, it must be framed as a typesetting task:

1. Preserve all wording, claims, facts, identities, examples, and CTAs.
2. Preserve sentence order.
3. Convert the draft into clean Markdown/HTML structure for WeChat reading.
4. Add or adjust line breaks only at safe punctuation boundaries.
5. Apply heading, bold, paragraph, and spacing conventions.
6. Use supported Writeflow `wf-*` modules when they help the existing content
   render better in WeChat.
7. Keep every module field grounded in the source article.
8. Do not add new headings, openings, endings, examples, or CTAs.
9. Do not rewrite the article to be more explosive, more human, or more
   commercial.
10. Preserve protected material-slot tokens exactly once.
11. Do not introduce unsupported modules, legacy module names in new output, or
    a second rhythm DSL.

If the user wants rewriting, humanization, title optimization, or growth
strategy, that should be a separate explicit action.

## Rendering Responsibilities

Code should:

- render ordinary Markdown into clean WeChat-compatible HTML;
- ensure Markdown bold markers become HTML emphasis and never remain visible;
- support the `01` plus bold heading rhythm without requiring a special module;
- apply justified text, 1.6 line height, and 1.6 character left/right side inset
  in managed preview and WeChat-copy HTML;
- avoid first-line indentation unless a future mode explicitly requires it;
- preserve protected placeholders intact;
- validate advanced modules if the source uses them;
- degrade invalid modules safely to ordinary Markdown/HTML;
- validate AI-introduced module syntax against the existing module definitions;
- render new `wf-*` modules with Writeflow-owned HTML structures and inline
  styles;
- keep module rendering deterministic and WeChat-compatible;
- produce a separate copy-safe HTML fragment that does not rely on preview-only
  classes, data attributes, or external CSS;
- log formatting mode, validation failures, retry reasons, final module names,
  and whether mobile preview validation passed.

Code should not:

- invent or remove article content;
- enforce a title, hook, ending, CTA, or case structure;
- enforce a machine-word banlist;
- transform quotation marks;
- enforce article length;
- make the article more commercial by default.

## Failure Behavior

1. Validate the formatted result for placeholder preservation, truncation, basic
   Markdown structure, module contracts, visible Markdown artifacts, malformed
   HTML, WeChat-copy compatibility, and mobile reading parameters.
2. Retry once with concrete validation feedback if AI formatting was used.
3. If both AI attempts fail, return a conservative local Markdown-to-HTML
   fallback.
4. The fallback may preserve headings, paragraphs, and emphasis.
5. The fallback must not create new content, modules, endings, examples, or
   conclusions.

## Preview Validation

The workflow must include a mobile preview check before the result is considered
ready. The check should verify:

- title and heading rendering;
- paragraph density;
- line height;
- left/right side inset;
- visible Markdown artifacts;
- unsupported module fences;
- obvious overflow or spacing problems;
- copy HTML integrity;
- absence of forbidden copy HTML features such as style tags, scripts, CSS
  variables, classes-as-contract, pseudo-elements, unsupported layout CSS, and
  external resources.

This can begin as deterministic HTML/CSS validation and later be paired with
browser screenshot review for representative mobile widths.

## Testing

Tests should cover:

- default formatting mode is human-wechat;
- Markdown bold renders without visible stars;
- title and section headings are fully bolded when present;
- `01` / bold heading rhythm survives Markdown-to-HTML rendering;
- justified text, 1.6 line height, and 1.6 left/right side inset are applied in
  managed preview and WeChat-copy HTML;
- the formatter does not confuse side inset with first-line indentation;
- quotation marks in source text are preserved;
- source sentences are not rewritten;
- source title, examples, data, identity, and CTA are not invented or removed;
- existing old modules still render;
- AI-introduced `wf-*` modules render when all fields are grounded in source
  content;
- invalid old modules degrade safely;
- no automatic `hero`, `verdict`, `cta`, ending, or summary module is injected;
- legacy module names are not requested in new AI formatting prompts;
- unsupported modules and rhythm DSL blocks are rejected or retried;
- new module HTML uses Writeflow-owned attributes, structure, and inline style
  rules rather than copied renderer markup;
- copied HTML passes the WeChat-safe sanitizer and does not depend on classes,
  data attributes, CSS variables, external CSS, hover, animation, pseudo
  elements, grid, or fixed positioning;
- representative paste/copy samples preserve readable spacing and module
  styling after the editor receives the HTML fragment;
- retry receives concrete validation feedback;
- fallback does not create new claims or modules.

## Out Of Scope

- title optimization;
- opening hook generation;
- humanization rewriting;
- machine-word banlist enforcement;
- article length enforcement;
- case/detail strengthening;
- sharing or conversion CTA generation;
- cover-image generation;
- full growth-article strategy;
- deleting old module support;
- building a full mode selector UI;
- changing credit pricing;
- WeChat editor clipboard automation.

## Acceptance Criteria

The feature is successful when the same article content:

- previews like a finished WeChat public-account article on mobile;
- copies as clean WeChat-compatible HTML;
- uses readable font size, line height, justified text, and left/right side
  inset;
- renders headings, numeric anchors, and bold emphasis cleanly;
- renders AI-selected supported modules through the existing parser and HTML
  renderer;
- uses Writeflow-owned module names and HTML style structures for new formatted
  output;
- produces a copy-safe HTML fragment whose visual result survives WeChat editor
  paste;
- contains no visible Markdown artifacts or broken module fences;
- preserves the user's wording, facts, order, examples, title, and CTA;
- still lets older module-based drafts preview and copy correctly.
