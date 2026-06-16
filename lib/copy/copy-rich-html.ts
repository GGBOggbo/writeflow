import { normalizeWechatHtml } from "@/lib/formatting/wechat-compat";

export async function copyRichHtml(html: string, plainText: string) {
  const normalizedHtml = normalizeWechatHtml(html);

  if (
    typeof ClipboardItem !== "undefined" &&
    typeof navigator.clipboard?.write === "function"
  ) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([normalizedHtml], { type: "text/html" }),
          "text/plain": new Blob([plainText], { type: "text/plain" }),
        }),
      ]);
      return;
    } catch {
      // Some browsers expose ClipboardItem but reject rich clipboard writes.
    }
  }

  const container = document.createElement("div");
  container.contentEditable = "true";
  container.setAttribute("aria-hidden", "true");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.innerHTML = normalizedHtml;
  document.body.appendChild(container);

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(container);
  selection?.removeAllRanges();
  selection?.addRange(range);

  try {
    if (!document.execCommand("copy")) {
      throw new Error("当前环境不支持自动复制富文本");
    }
  } finally {
    selection?.removeAllRanges();
    container.remove();
  }
}
