import { describe, expect, it } from "vitest";
import { renderSafeGfm } from "./render";

describe("renderSafeGfm", () => {
  it("renders the supported GFM article structures", () => {
    const html = renderSafeGfm(`# 一级标题

## 二级标题

正文包含 **粗体**、*斜体*、~~删除线~~ 和 \`行内代码\`。

> 一段引用

- 无序项
- [x] 已完成
- [ ] 未完成

1. 有序项

[安全链接](https://example.com)

![图片说明](https://example.com/a.png)

---

| 项目 | 结果 |
| --- | --- |
| A | 通过 |

\`\`\`ts
const answer = 42;
\`\`\``);

    expect(html).toContain("<h1>一级标题</h1>");
    expect(html).toContain("<h2>二级标题</h2>");
    expect(html).toContain("<strong>粗体</strong>");
    expect(html).toContain("<em>斜体</em>");
    expect(html).toContain("<del>删除线</del>");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<ol>");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('src="https://example.com/a.png"');
    expect(html).toContain("<hr />");
    expect(html).toContain("<table>");
    expect(html).toContain("<code>行内代码</code>");
    expect(html).toContain('<code class="language-ts">');
  });

  it("removes raw HTML, executable attributes, and unsafe URL schemes", () => {
    const html = renderSafeGfm(`<script>alert(1)</script>

<img src="x" onerror="alert(1)">

[危险链接](javascript:alert(1))

![危险图片](javascript:alert(2))`);

    expect(html).not.toMatch(/<script|onerror|javascript:/i);
    expect(html).not.toContain("alert(1)");
    expect(html).toContain("危险链接");
    expect(html).toContain("危险图片");
  });

  it("adds safe attributes to external links", () => {
    const html = renderSafeGfm("[站外链接](https://example.com)");

    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("renders the five GFM alert types with distinct semantic classes", () => {
    const html = renderSafeGfm(`> [!NOTE]
> 提示内容

> [!TIP]
> 技巧内容

> [!IMPORTANT]
> 重要内容

> [!WARNING]
> 警告内容

> [!CAUTION]
> 注意内容`);

    for (const type of ["note", "tip", "important", "warning", "caution"]) {
      expect(html).toContain(`markdown-alert-${type}`);
    }
    expect(html).toContain("markdown-alert-title");
    expect(html).not.toContain("[!NOTE]");
  });

  it("renders footnote references, definitions, and back-links", () => {
    const html = renderSafeGfm(`正文需要补充说明[^1]，也可以引用链接[^source]。

[^1]: 第一条脚注。
[^source]: [参考资料](https://example.com)`);

    expect(html).toContain('id="fnref-1"');
    expect(html).toContain('href="#fn-1"');
    expect(html).toContain('id="fn-1"');
    expect(html).toContain('href="#fnref-1"');
    expect(html).toContain("第一条脚注");
    expect(html).toContain('href="https://example.com"');
    expect(html).not.toContain("[^1]");
  });
});
