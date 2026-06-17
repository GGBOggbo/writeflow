const TEXT_TAGS = "p, li, h1, h2, h3, h4, h5, h6, blockquote, span, a";
const ROOT_FONT_SIZE_TAGS = new Set(["P", "LI", "BLOCKQUOTE", "SPAN"]);
const INLINE_EMPHASIS_TAGS = "strong, b, em, span, a, code";
const LEADING_CJK_PUNCTUATION = /^\s*([：；，。！？、:])([\s\S]*)$/;

function removeUnsafeAndInternalMarkup(root: HTMLElement) {
  root.querySelectorAll("script, style, iframe, object, embed").forEach((node) =>
    node.remove()
  );

  [root, ...Array.from(root.querySelectorAll("*"))].forEach((element) => {
    element.removeAttribute("class");

    for (const attribute of Array.from(element.attributes)) {
      if (
        attribute.name.startsWith("data-") ||
        attribute.name.toLowerCase().startsWith("on")
      ) {
        element.removeAttribute(attribute.name);
      }
    }
  });
}

function isImageCell(element: Element) {
  if (element.tagName === "IMG") return true;
  return (
    element.tagName === "A" &&
    element.children.length === 1 &&
    element.firstElementChild?.tagName === "IMG"
  );
}

function convertImageFlexRows(root: HTMLElement, doc: Document) {
  root.querySelectorAll("div, section, p").forEach((node) => {
    const style = node.getAttribute("style") ?? "";
    if (!/display\s*:\s*flex/i.test(style)) return;

    const children = Array.from(node.children);
    if (children.length < 2 || !children.every(isImageCell)) return;

    const table = doc.createElement("table");
    table.setAttribute(
      "style",
      "width:100%;border-collapse:collapse;margin:16px 0;border:none;"
    );
    const tbody = doc.createElement("tbody");
    const row = doc.createElement("tr");
    row.setAttribute("style", "border:none;background:transparent;");

    children.forEach((child) => {
      const cell = doc.createElement("td");
      cell.setAttribute(
        "style",
        "padding:0 4px;vertical-align:top;border:none;background:transparent;"
      );
      const image =
        child.tagName === "IMG" ? child : child.querySelector("img");
      if (image instanceof HTMLElement) {
        image.style.width = "100%";
        image.style.height = "auto";
        image.style.display = "block";
        image.style.margin = "0 auto";
      }
      cell.appendChild(child);
      row.appendChild(cell);
    });

    tbody.appendChild(row);
    table.appendChild(tbody);
    node.replaceWith(table);
  });
}

const STACKED_MODULES = [
  "cards",
  "metrics",
  "people",
  "cases",
  "pricing",
  "image-text",
  "image-compare",
  "image-steps",
  "cta",
] as const;

const FORBIDDEN_STYLE_PROPERTIES = [
  "display",
  "grid-template-columns",
  "grid-template-rows",
  "grid-auto-flow",
  "position",
  "z-index",
  "transform",
  "filter",
  "backdrop-filter",
  "animation",
  "transition",
  "gap",
  "column-gap",
  "row-gap",
  "flex-direction",
  "flex-wrap",
  "justify-content",
  "align-items",
  "overflow-x",
  "overflow-y",
  "scroll-snap-type",
  "scroll-snap-align",
] as const;

function removeLayoutStyles(element: HTMLElement) {
  for (const property of FORBIDDEN_STYLE_PROPERTIES) {
    element.style.removeProperty(property);
  }
}

function stackLayoutGroups(module: HTMLElement) {
  module.querySelectorAll<HTMLElement>("div, section").forEach((group) => {
    const style = group.getAttribute("style") ?? "";
    if (!/display\s*:\s*(?:flex|grid)/i.test(style)) return;

    removeLayoutStyles(group);
    group.style.display = "block";
    Array.from(group.children).forEach((child, index, children) => {
      if (!(child instanceof HTMLElement)) return;
      child.style.display = "block";
      child.style.width = "100%";
      child.style.maxWidth = "100%";
      child.style.boxSizing = "border-box";
      if (index < children.length - 1 && !child.style.marginBottom) {
        child.style.marginBottom = "12px";
      }
    });
  });
}

function stackAdvancedModuleLayouts(root: HTMLElement) {
  for (const name of STACKED_MODULES) {
    root
      .querySelectorAll<HTMLElement>(`[data-mpa-action-id="${name}"]`)
      .forEach(stackLayoutGroups);
  }

  root
    .querySelectorAll<HTMLElement>("[data-writeflow-module]")
    .forEach(stackLayoutGroups);
}

function removeUnsupportedCss(element: HTMLElement) {
  removeLayoutStyles(element);

  const style = element.getAttribute("style") ?? "";
  if (!/var\(|color-mix\(|calc\(|@|url\(/i.test(style)) {
    if (!element.getAttribute("style")?.trim()) {
      element.removeAttribute("style");
    }
    return;
  }

  const safeStyle = style
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part && !/var\(|color-mix\(|calc\(|@|url\(/i.test(part))
    .join(";");

  if (safeStyle) {
    element.setAttribute("style", safeStyle);
  } else {
    element.removeAttribute("style");
  }
}

function removeUnsupportedCssFromTree(root: HTMLElement) {
  [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))].forEach(
    removeUnsupportedCss
  );
}

function flattenGalleryAndLongImages(root: HTMLElement) {
  root
    .querySelectorAll<HTMLElement>('[data-mpa-action-id="gallery"]')
    .forEach((gallery) => {
      gallery.querySelectorAll<HTMLElement>("div, section").forEach((group) => {
        group.style.removeProperty("white-space");
        group.style.removeProperty("overflow-x");
        group.style.removeProperty("overflow");
      });
      gallery.querySelectorAll<HTMLElement>("figure").forEach((figure) => {
        figure.style.display = "block";
        figure.style.width = "100%";
        figure.style.maxWidth = "100%";
        figure.style.boxSizing = "border-box";
        figure.style.margin = "0 0 14px";
      });
    });

  root
    .querySelectorAll<HTMLElement>('[data-mpa-action-id="longimage"]')
    .forEach((viewer) => {
      viewer.querySelectorAll<HTMLElement>("div, section").forEach((container) => {
        container.style.removeProperty("max-height");
        container.style.removeProperty("height");
        container.style.removeProperty("overflow-y");
        container.style.removeProperty("overflow");
      });
      viewer.querySelectorAll<HTMLElement>("img").forEach((item) => {
        item.style.display = "block";
        item.style.width = "100%";
        item.style.height = "auto";
        item.style.maxWidth = "100%";
      });
    });
}

function flattenListParagraphs(root: HTMLElement, doc: Document) {
  root.querySelectorAll("li p").forEach((paragraph) => {
    const span = doc.createElement("span");
    const style = paragraph.getAttribute("style");
    if (style) span.setAttribute("style", style);
    while (paragraph.firstChild) span.appendChild(paragraph.firstChild);
    paragraph.replaceWith(span);
  });
}

function attachPunctuationToEmphasis(root: HTMLElement) {
  root.querySelectorAll(INLINE_EMPHASIS_TAGS).forEach((node) => {
    const next = node.nextSibling;
    if (!next || next.nodeType !== Node.TEXT_NODE) return;

    const match = (next.textContent ?? "").match(LEADING_CJK_PUNCTUATION);
    if (!match) return;

    node.append(match[1]);
    next.textContent = match[2];
  });
}

function applyTypography(root: HTMLElement) {
  const typography = {
    fontFamily: root.style.fontFamily,
    fontSize: root.style.fontSize,
    lineHeight: root.style.lineHeight,
    color: root.style.color,
  };

  root.querySelectorAll<HTMLElement>(TEXT_TAGS).forEach((element) => {
    if (element.closest("pre, code")) return;

    if (typography.fontFamily && !element.style.fontFamily) {
      element.style.fontFamily = typography.fontFamily;
    }
    if (typography.lineHeight && !element.style.lineHeight) {
      element.style.lineHeight = typography.lineHeight;
    }
    if (typography.color && !element.style.color) {
      element.style.color = typography.color;
    }
    if (
      typography.fontSize &&
      ROOT_FONT_SIZE_TAGS.has(element.tagName) &&
      !element.style.fontSize
    ) {
      element.style.fontSize = typography.fontSize;
    }
  });
}

export function normalizeWechatHtml(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const root = doc.body.firstElementChild;

  if (!(root instanceof HTMLElement)) return "";

  convertImageFlexRows(root, doc);
  stackAdvancedModuleLayouts(root);
  flattenGalleryAndLongImages(root);
  flattenListParagraphs(root, doc);
  attachPunctuationToEmphasis(root);
  applyTypography(root);
  removeUnsupportedCssFromTree(root);
  removeUnsafeAndInternalMarkup(root);

  return root.outerHTML;
}
