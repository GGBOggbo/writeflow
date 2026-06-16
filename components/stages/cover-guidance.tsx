"use client";

import { useState } from "react";

export function CoverGuidance({
  suggestion,
  imagePrompt,
}: {
  suggestion: string | null;
  imagePrompt: string | null;
}) {
  const [showImagePrompt, setShowImagePrompt] = useState(false);

  if (!suggestion && !imagePrompt) {
    return null;
  }

  return (
    <div className="rounded-[28px] border border-[var(--line-soft)] bg-[#fcfdff] p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-stone-900">封面配图建议</p>
        {imagePrompt ? (
          <button
            type="button"
            aria-expanded={showImagePrompt}
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 transition hover:border-stone-500 hover:text-stone-900"
            onClick={() => setShowImagePrompt((current) => !current)}
          >
            {showImagePrompt
              ? "收起 AI 封面提示词"
              : "生成 AI 封面提示词"}
          </button>
        ) : null}
      </div>

      {suggestion ? (
        <p className="mt-3 text-sm leading-6 text-stone-700">{suggestion}</p>
      ) : null}

      {imagePrompt && showImagePrompt ? (
        <div className="mt-5 border-t border-stone-200 pt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-stone-900">
              AI 封面提示词
            </p>
            <p className="text-xs text-stone-500">
              已准备好，不会再次调用 AI，不扣积分
            </p>
          </div>
          <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-xs leading-6 text-stone-700">
            {imagePrompt}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
