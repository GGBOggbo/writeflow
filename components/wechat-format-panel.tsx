"use client";

import { useMemo, useState } from "react";
import { copyRichHtml } from "@/lib/copy/copy-rich-html";
import { renderWechatHtml } from "@/lib/formatting/render";
import type {
  DraftFormatting,
  WechatFormatTheme,
} from "@/types/workflow";

const themeOptions: Array<{
  id: WechatFormatTheme;
  label: string;
  swatch: string;
}> = [
  { id: "professional-blue", label: "专业蓝", swatch: "#2563eb" },
  { id: "warm-orange", label: "温暖橙", swatch: "#ea580c" },
  { id: "fresh-teal", label: "清爽青绿", swatch: "#0f766e" },
];

export function WechatFormatPanel({
  draftLabel,
  formatting,
  loading,
  disabled = false,
  canGenerate,
  onGenerate,
  onThemeChange,
}: {
  draftLabel: string;
  formatting?: DraftFormatting;
  loading: boolean;
  disabled?: boolean;
  canGenerate: boolean;
  onGenerate: () => void;
  onThemeChange: (theme: WechatFormatTheme) => void;
}) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle"
  );
  const html = useMemo(
    () =>
      formatting
        ? renderWechatHtml(formatting.blocks, formatting.selectedTheme)
        : "",
    [formatting]
  );
  const plainText = useMemo(
    () => formatting?.blocks.map((block) => block.text).join("\n\n") ?? "",
    [formatting]
  );

  const handleCopy = async () => {
    try {
      await copyRichHtml(html, plainText);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  };

  return (
    <section
      data-testid="wechat-format-panel"
      className="flex h-full flex-col overflow-hidden rounded-[24px] border border-stone-200 bg-white"
    >
      {!formatting ? (
        <div className="flex flex-1 flex-col justify-center gap-4 p-6 sm:p-7">
          <div>
            <p className="editorial-kicker text-xs font-semibold text-stone-500">
              公众号排版
            </p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-stone-900">
              识别语义，再套用稳定样式
            </h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              AI 只判断标题、金句、痛点和行动引导，不改写正文。首次消耗 1 积分，切换主题和复制不再扣费。
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#233044]">
              当前正文：{draftLabel}
            </p>
            <button
              type="button"
              className="mt-3 w-full rounded-full bg-[#315f8b] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#274f75] disabled:cursor-not-allowed disabled:bg-stone-300"
              onClick={onGenerate}
              disabled={loading || disabled || !canGenerate}
            >
              {loading
                ? "正在识别排版结构..."
                : canGenerate
                  ? "公众号排版，消耗 1 积分"
                  : "积分不足"}
            </button>
            <p className="mt-2 text-xs leading-5 text-stone-500">
              生成后可在三套彩色主题之间免费切换。
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col bg-[#f1efeb] p-4 sm:p-5">
          <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col">
            <div className="mb-3 flex items-center justify-center gap-2">
              <span className="text-[11px] font-semibold tracking-[0.12em] text-stone-500">
                文章预览 · 可滚动
              </span>
              <span className="rounded-full bg-[#50708f]/10 px-2 py-0.5 text-[10px] font-semibold text-[#50708f]">
                已完成语义识别
              </span>
            </div>
            <div
              aria-label="公众号排版预览"
              data-theme={formatting.selectedTheme}
              className="max-h-[480px] flex-1 overflow-y-auto border border-stone-200 bg-white shadow-[0_8px_28px_rgba(35,35,30,0.06)]"
              dangerouslySetInnerHTML={{ __html: html }}
            />
            <div className="mt-4 space-y-3">
              <p className="text-xs text-stone-500">当前正文：{draftLabel}</p>
              <fieldset>
                <legend className="sr-only">选择主题</legend>
                <div className="flex flex-wrap items-center gap-2">
                  {themeOptions.map((theme) => {
                    const active = formatting.selectedTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        aria-pressed={active}
                        className={[
                          "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                          active
                            ? "border-stone-300 bg-stone-100 text-stone-900"
                            : "border-stone-200 text-stone-500 hover:text-stone-900",
                        ].join(" ")}
                        onClick={() => {
                          setCopyStatus("idle");
                          onThemeChange(theme.id);
                        }}
                      >
                        <span
                          className="h-1.5 w-4 rounded-full"
                          style={{ backgroundColor: theme.swatch }}
                          aria-hidden="true"
                        />
                        {theme.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <button
                type="button"
                className="w-full rounded-lg bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
                onClick={() => void handleCopy()}
              >
                {copyStatus === "copied"
                  ? "已复制公众号富文本"
                  : "复制到公众号编辑器"}
              </button>
              <p className="text-xs leading-5 text-stone-500" aria-live="polite">
                {copyStatus === "copied"
                  ? "复制成功，直接粘贴到公众号后台即可。"
                  : copyStatus === "failed"
                    ? "浏览器拦截了自动复制，请复制下方 HTML。"
                    : "会同时写入富文本和纯文本，兼容不同粘贴环境。"}
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
      )}
    </section>
  );
}
