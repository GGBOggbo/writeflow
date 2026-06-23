"use client";

import { useMemo, useState, type Ref, type UIEventHandler } from "react";
import { copyRichHtml } from "@/lib/copy/copy-rich-html";
import { renderExtendedMarkdown } from "@/lib/formatting/render-extended-markdown";
import { CLAUDE_TOKENS } from "@/lib/formatting/format-tokens";

type PreviewTheme = "wechat-native" | "claude";

const THEME_LABELS: Record<PreviewTheme, string> = {
  "wechat-native": "Writeflow 蓝调",
  claude: "Claude 暖纸",
};

const THEME_ACTIVE_CLASSES: Record<PreviewTheme, string> = {
  "wechat-native": "border-[#5f7993] bg-[#eef2f6] text-[#233044]",
  claude: "border-[#c96442] bg-[#fdf0ea] text-[#9f482f]",
};

const MATERIAL_PLACEHOLDER_PATTERN = /【💡需要你补充：[^】]+】/;

export function WechatFormatPanel({
  draftLabel,
  content,
  previewScrollRef,
  onPreviewScroll,
  scrollSyncEnabled = true,
  onToggleScrollSync,
}: {
  draftLabel: string;
  content: string;
  previewScrollRef?: Ref<HTMLDivElement>;
  onPreviewScroll?: UIEventHandler<HTMLDivElement>;
  scrollSyncEnabled?: boolean;
  onToggleScrollSync?: () => void;
}) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle"
  );
  const [theme, setTheme] = useState<PreviewTheme>("wechat-native");
  const html = useMemo(
    () =>
      renderExtendedMarkdown(
        content,
        theme === "claude" ? CLAUDE_TOKENS : undefined
      ),
    [content, theme]
  );
  const hasMaterialPlaceholder = MATERIAL_PLACEHOLDER_PATTERN.test(content);

  const handleCopy = async () => {
    if (hasMaterialPlaceholder) return;
    try {
      await copyRichHtml(html, content);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  };

  return (
    <section
      data-testid="wechat-format-panel"
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-stone-200 bg-white"
    >
      <div
        data-testid="wechat-preview-canvas"
        className="flex min-h-0 flex-1 flex-col p-4 sm:p-5"
        style={{ background: theme === "claude" ? "#f5f4ed" : "#f3f5f7" }}
      >
        <div
          data-testid="wechat-preview-layout"
          className="mx-auto flex min-h-0 w-full max-w-[460px] flex-1 flex-col"
        >
          <div
            data-testid="wechat-preview-toolbar"
            className="mb-3 shrink-0"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold tracking-[0.12em] text-stone-500">
                  文章预览 · 可滚动
                </span>
                <span className="rounded-full bg-[#50708f]/10 px-2 py-0.5 text-[10px] font-semibold text-[#50708f]">
                  本地实时预览
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {(Object.keys(THEME_LABELS) as PreviewTheme[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={theme === id}
                    className={[
                      "rounded-full border px-2.5 py-1 text-[10px] font-semibold transition",
                      theme === id
                        ? THEME_ACTIVE_CLASSES[id]
                        : "border-stone-300 bg-white text-stone-500 hover:bg-stone-50",
                    ].join(" ")}
                    onClick={() => setTheme(id)}
                  >
                    {THEME_LABELS[id]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                aria-pressed={scrollSyncEnabled}
                className={[
                  "hidden rounded-full border px-3 py-1 text-[11px] font-semibold transition xl:inline-flex",
                  scrollSyncEnabled
                    ? "border-[#7fa0bb] bg-[#eaf1f7] text-[#315f8b]"
                    : "border-stone-300 bg-white text-stone-500",
                ].join(" ")}
                onClick={onToggleScrollSync}
              >
                {scrollSyncEnabled ? "滚动同步开" : "滚动同步关"}
              </button>
            </div>
          </div>
          <div
            data-testid="pro-max-preview-host"
            className="flex min-h-0 flex-1 items-start justify-center overflow-x-auto overflow-y-hidden py-1"
          >
            <div
              data-testid="pro-max-device-frame"
              className="relative h-[952px] w-[450px] max-w-full shrink-0 rounded-[52px] bg-[linear-gradient(135deg,#e4e7ec_0%,#d5d9e2_20%,#eef0f5_50%,#d8dce5_80%,#c5cbd6_100%)] p-[10px] shadow-[inset_0_0_3px_rgba(255,255,255,0.8),inset_0_-2px_6px_rgba(100,110,130,0.22),0_12px_32px_-10px_rgba(0,0,0,0.14),0_24px_48px_-20px_rgba(0,0,0,0.10)]"
            >
              <div
                data-testid="pro-max-device-screen"
                className="h-full min-h-0 overflow-hidden rounded-[42px] bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
              >
                <div
                  ref={previewScrollRef}
                  aria-label="公众号排版预览"
                  data-theme="wechat-native"
                  className="h-full overflow-y-auto overscroll-contain bg-white"
                  onScroll={onPreviewScroll}
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-[18px] left-1/2 h-[5px] w-[118px] -translate-x-1/2 rounded-full bg-white/75 shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
              />
            </div>
          </div>
          <div
            data-testid="wechat-preview-footer"
            className="mt-4 shrink-0 space-y-3"
          >
            <p className="text-xs text-stone-500">当前正文：{draftLabel}</p>
            <button
              type="button"
              disabled={hasMaterialPlaceholder}
              className={[
                "w-full rounded-lg px-5 py-3 text-sm font-semibold transition",
                hasMaterialPlaceholder
                  ? "cursor-not-allowed bg-rose-100 text-rose-700"
                  : "bg-stone-900 text-white hover:bg-stone-700",
              ].join(" ")}
              onClick={() => void handleCopy()}
            >
              {hasMaterialPlaceholder
                ? "请先补完真实素材"
                : copyStatus === "copied"
                  ? "已复制公众号富文本"
                  : "复制到公众号编辑器"}
            </button>
            <p className="text-xs leading-5 text-stone-500" aria-live="polite">
              {hasMaterialPlaceholder
                ? "请先补完真实素材后再复制。"
                : copyStatus === "copied"
                ? "复制成功，直接粘贴到公众号后台即可。"
                : copyStatus === "failed"
                  ? "浏览器拦截了自动复制，请复制下方 HTML。"
                  : "本地生成富文本，同时保留 Markdown 纯文本。"}
            </p>
            {copyStatus === "failed" ? (
              <label className="block">
                <span className="text-sm font-semibold text-[#233044]">
                  手动复制 HTML
                </span>
                <textarea
                  className="mt-2 min-h-32 w-full rounded-2xl border border-[#c9d8e5] bg-white p-4 font-mono text-xs leading-5 text-stone-600"
                  readOnly
                  value={html}
                />
              </label>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
