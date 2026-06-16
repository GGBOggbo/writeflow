"use client";

type SearchToggleProps = {
  checked: boolean;
  disabled?: boolean;
  label?: string;
  helpText?: string;
  onChange?: (checked: boolean) => void;
};

export function SearchToggle({
  checked,
  disabled = false,
  label = "联网增强",
  helpText = "参考最新网页信息，速度会变慢",
  onChange,
}: SearchToggleProps) {
  return (
    <label
      className="editorial-soft flex items-start gap-4 rounded-[24px] border border-[rgba(35,48,68,0.08)] px-4 py-4 text-sm text-stone-700"
      data-onboarding-target="search-toggle"
    >
      <span className="relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange?.(event.target.checked)}
        />
        <span className="h-6 w-11 rounded-full bg-stone-300 transition peer-checked:bg-[#233044] peer-disabled:opacity-50" />
        <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
      </span>
      <span className="space-y-1.5">
        <span className="block font-medium text-[#233044]">{label}</span>
        <span className="block text-xs leading-5 text-stone-500">{helpText}</span>
      </span>
    </label>
  );
}
