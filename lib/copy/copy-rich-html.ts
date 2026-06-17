import { normalizeWechatHtml } from "@/lib/formatting/wechat-compat";

/**
 * 把 :::wf-xxx ... ::: 围栏从纯文本里剥离,只保留字段内容作为降级纯文本。
 * 复制时 text/plain 不应暴露原始围栏语法(用户粘贴会看到 :::wf-hook 原文)。
 */
function stripWriteflowFences(plainText: string) {
  return plainText
    .replace(/:::[a-z][a-z0-9-]*\s*\n/g, "")
    .replace(/^:::\s*$/gm, "")
    .replace(/^[a-z]+:\s?/gm, "") // 字段型 key:
    .trim();
}

export async function copyRichHtml(html: string, plainText: string) {
  const normalizedHtml = normalizeWechatHtml(html);
  const safePlain = stripWriteflowFences(plainText);

  if (
    typeof ClipboardItem !== "undefined" &&
    typeof navigator.clipboard?.write === "function"
  ) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([normalizedHtml], { type: "text/html" }),
          "text/plain": new Blob([safePlain], { type: "text/plain" }),
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
