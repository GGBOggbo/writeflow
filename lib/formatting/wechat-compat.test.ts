import { describe, expect, it } from "vitest";
import { parseAdvancedMarkdown } from "@/lib/markdown/advanced-modules";
import { renderAdvancedModule } from "./advanced-module-render";
import { normalizeWechatHtml } from "./wechat-compat";

function parse(html: string) {
  return new DOMParser().parseFromString(html, "text/html");
}

describe("normalizeWechatHtml", () => {
  it("removes editor-only and executable markup from the exported article", () => {
    const output = normalizeWechatHtml(`
      <section data-wechat-format="professional-blue" class="preview" style="font-size:16px;color:#333;">
        <p data-format-block="paragraph" class="copy">正文</p>
        <a href="https://example.com" onclick="steal()">链接</a>
        <script>alert(1)</script>
      </section>
    `);

    expect(output).toContain("<section");
    expect(output).toContain("font-size:16px");
    expect(output).not.toContain("data-wechat-format");
    expect(output).not.toContain("data-format-block");
    expect(output).not.toContain("class=");
    expect(output).not.toContain("onclick");
    expect(output).not.toContain("<script");
  });

  it("copies missing root typography onto text elements", () => {
    const output = normalizeWechatHtml(`
      <section style="font-family:PingFang SC;font-size:16px;line-height:2;color:#455468;">
        <p>正文</p>
        <blockquote style="font-size:18px;">引用</blockquote>
        <ul><li><span>列表</span></li></ul>
      </section>
    `);
    const doc = parse(output);

    expect(doc.querySelector("p")?.getAttribute("style")).toContain(
      "font-size: 16px"
    );
    expect(doc.querySelector("p")?.getAttribute("style")).toContain(
      "line-height: 2"
    );
    expect(doc.querySelector("blockquote")?.getAttribute("style")).toContain(
      "font-size: 18px"
    );
    expect((doc.querySelector("li") as HTMLElement | null)?.style.fontFamily).toBe(
      '"PingFang SC"'
    );
    expect(doc.querySelector("span")?.getAttribute("style")).toContain(
      "color: rgb(69, 84, 104)"
    );
  });

  it("flattens paragraph wrappers inside list items without losing emphasis", () => {
    const output = normalizeWechatHtml(`
      <section><ul><li><p>一个<strong>重点</strong></p><p>补充</p></li></ul></section>
    `);
    const doc = parse(output);
    const item = doc.querySelector("li");

    expect(item?.querySelector("p")).toBeNull();
    expect(item?.querySelector("strong")?.textContent).toBe("重点");
    expect(item?.textContent).toContain("一个重点补充");
  });

  it("keeps adjacent Chinese punctuation inside inline emphasis", () => {
    const output = normalizeWechatHtml(
      "<section><p><strong>结论</strong>：现在行动。</p></section>"
    );
    const doc = parse(output);

    expect(doc.querySelector("strong")?.textContent).toBe("结论：");
    expect(doc.querySelector("p")?.textContent).toBe("结论：现在行动。");
  });

  it("converts image-only flex rows into WeChat-stable tables", () => {
    const output = normalizeWechatHtml(`
      <section>
        <div style="display:flex;gap:8px;">
          <img src="a.png" alt="A" />
          <a href="https://example.com"><img src="b.png" alt="B" /></a>
        </div>
      </section>
    `);
    const doc = parse(output);

    expect(doc.querySelector("table")).not.toBeNull();
    expect(doc.querySelectorAll("td")).toHaveLength(2);
    expect(doc.querySelectorAll("img")).toHaveLength(2);
    expect(output).not.toContain("display:flex");
  });

  it("stacks multi-column advanced modules into stable full-width sections", () => {
    const output = normalizeWechatHtml(`
      <article data-wechat-theme="wechat-native">
        <section data-mpa-action-id="pricing">
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
            <section style="width:33%;">轻量版</section>
            <section style="width:33%;">专业版</section>
          </div>
        </section>
      </article>
    `);
    const doc = parse(output);
    const cards = doc.querySelectorAll("article > section > div > section");

    expect(cards).toHaveLength(2);
    expect((cards[0] as HTMLElement).style.width).toBe("100%");
    expect((cards[0] as HTMLElement).style.display).toBe("");
    expect(output).not.toMatch(/display:\s*grid|grid-template-columns/i);
  });

  it("normalizes wf modules into copy-safe inline HTML", () => {
    const output = normalizeWechatHtml(`
      <article data-wechat-theme="writeflow" class="preview">
        <section data-writeflow-module="wf-points" class="wf" style="display:grid;grid-template-columns:1fr 1fr;color:var(--fg);transform:translateY(1px);">
          <section style="display:flex;gap:12px;"><p>01</p><p>先跑通</p></section>
        </section>
      </article>
    `);

    expect(output).toContain("先跑通");
    expect(output).not.toContain("data-writeflow-module");
    expect(output).not.toContain("class=");
    expect(output).not.toContain("var(--fg)");
    expect(output).not.toContain("grid-template-columns");
    expect(output).not.toContain("transform:");
  });

  it("stacks image comparisons and keeps both labelled images", () => {
    const output = normalizeWechatHtml(`
      <article>
        <section data-mpa-action-id="image-compare">
          <div style="display:flex;gap:12px;">
            <figure style="width:50%;"><strong>改版前</strong><img src="before.png" alt="前" /></figure>
            <figure style="width:50%;"><strong>改版后</strong><img src="after.png" alt="后" /></figure>
          </div>
        </section>
      </article>
    `);
    const doc = parse(output);

    expect(doc.querySelectorAll("figure")).toHaveLength(2);
    expect(doc.querySelectorAll("img")).toHaveLength(2);
    expect(doc.body.textContent).toContain("改版前");
    expect(doc.body.textContent).toContain("改版后");
    expect(output).not.toContain("display:flex");
  });

  it("flattens galleries and long-image viewers into ordinary image sequences", () => {
    const output = normalizeWechatHtml(`
      <article>
        <section data-mpa-action-id="gallery">
          <div style="white-space:nowrap;overflow-x:auto;">
            <figure style="display:inline-block;width:82%;"><img src="a.png" alt="A" /></figure>
            <figure style="display:inline-block;width:82%;"><img src="b.png" alt="B" /></figure>
          </div>
        </section>
        <section data-mpa-action-id="longimage">
          <div style="max-height:480px;overflow-y:auto;"><img src="long.png" alt="长图" /></div>
        </section>
      </article>
    `);
    const doc = parse(output);

    expect(doc.querySelectorAll("img")).toHaveLength(3);
    expect(output).not.toMatch(/overflow-[xy]:\s*auto|white-space:\s*nowrap|max-height/i);
    for (const figure of doc.querySelectorAll("figure")) {
      expect((figure as HTMLElement).style.width).toBe("100%");
      expect((figure as HTMLElement).style.display).toBe("");
    }
  });

  it("preserves dialogue, FAQ, links, images, and footnotes while removing module metadata", () => {
    const output = normalizeWechatHtml(`
      <article data-wechat-theme="wechat-native" class="preview">
        <section data-mpa-action-id="dialogue"><p>用户：你好</p><p>AI：你好</p></section>
        <section data-mpa-action-id="faq"><p>问题</p><p>答案</p></section>
        <a href="https://example.com">资料</a>
        <img src="https://example.com/a.png" alt="示例" />
        <section class="footnotes"><ol><li id="fn-1">脚注</li></ol></section>
      </article>
    `);

    expect(output).toContain("用户：你好");
    expect(output).toContain("答案");
    expect(output).toContain('href="https://example.com"');
    expect(output).toContain('src="https://example.com/a.png"');
    expect(output).toContain('id="fn-1"');
    expect(output).toContain("脚注");
    expect(output).not.toContain("data-mpa-action-id");
    expect(output).not.toContain("class=");
  });

  it.skip("stacks CTA action cards for WeChat without losing their labels", () => {
    const [node] = parseAdvancedMarkdown(`:::cta
title: 先把主流程完整跑一遍
note: BUILD WITH STRUCTURE
:::`);
    if (!node || node.type !== "module") {
      throw new Error("Expected CTA module");
    }

    const output = normalizeWechatHtml(
      `<article>${renderAdvancedModule(node)}</article>`
    );
    const doc = parse(output);
    const actionCards = doc.querySelectorAll(
      'article > section > section > section'
    );

    expect(output).toContain("保存灵感");
    expect(output).toContain("直接套用");
    expect(output).toContain("继续体验");
    expect(output).not.toMatch(
      /display:\s*grid|grid-template-columns|data-mpa-cta-actions/i
    );
    expect(actionCards).toHaveLength(3);
    for (const card of actionCards) {
      expect((card as HTMLElement).style.width).toBe("100%");
    }
  });
});
