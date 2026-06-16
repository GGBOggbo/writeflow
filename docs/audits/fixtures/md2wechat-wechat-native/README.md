# md2wechat wechat-native reference fixtures

This directory preserves the exact input/output pair supplied by the user on
2026-06-15 for renderer auditing and visual regression work.

## Files

- `full-module-source.md`: 411-line Markdown source containing the complete
  advanced-module sample.
- `full-module-rendered.html`: 1006-line HTML rendered from that Markdown by
  the rich `wechat-native` renderer.

## Integrity

| File | Bytes | SHA-256 |
|---|---:|---|
| `full-module-source.md` | 16030 | `a9a442e22cc71f1bdd1ac3a3652d2f129dedf19f3a651a7467f987e08815b9b4` |
| `full-module-rendered.html` | 156034 | `48ccafe6c50fde663014e36f1fef91c9721296f3f6ae2aca4b2846b6f833d854` |

## Coverage

The source declares all 31 supported module names:

`hero`, `cards`, `metrics`, `infographic`, `audience-fit`, `verdict`,
`people`, `cases`, `pricing`, `faq`, `logos`, `part`, `label-title`, `quote`,
`image-text`, `image-compare`, `image-annotate`, `toc`, `checklist`, `toolbox`,
`specs`, `image-steps`, `notice`, `gallery`, `longimage`, `dialogue`, `summary`,
`author-card`, `series`, `subscribe`, and `cta`.

`longimage` and `dialogue` each appear twice, so the source contains 33 module
instances in total. The rendered HTML contains the same module instances. It
also includes five GFM alert variants, footnotes, highlighted code, images,
gallery behavior, and long-image behavior.

## Relationship To The Previous Sample

The earlier `Claude Code` article HTML supplied by the user had SHA-256
`a364a3acb9da168a0e53802c5df2b83dc94a7d735b10c339ffc0b4f1f941fdc9` and
contained only `cta` and `verdict` advanced modules.

It is a content-specific subset of the same rich renderer represented here:

- Both use a `677px` outer article width and the same warm-paper color family.
- Their `cta` modules use the same warm gradient shell, three fixed action
  cards, and a two-column grid. Three actions therefore render as `2 + 1`.
- Their `verdict` modules use the same accent marker, eyebrow, title, and body
  skeleton.

This differs from the current application renderer in
`lib/formatting/advanced-module-render.ts`, whose `cta` contract currently
renders only `title` and optional `note` as a green card. The fixtures are the
reference evidence for closing that renderer-contract gap; they are not
runtime dependencies.
