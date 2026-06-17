/**
 * Format token registry — drives the inline styles emitted by the
 * extended-Markdown renderer (`renderExtendedMarkdown`) and every advanced
 * module renderer (`advanced-module-render.ts`).
 *
 * The renderer reads tokens through `getFormatTokens()`. Call
 * `setFormatTokens(theme)` before rendering to switch theme, and
 * `resetFormatTokens()` afterwards to restore the default. Because the
 * whole render pipeline is synchronous, a module-level binding is safe
 * for the duration of a single `renderExtendedMarkdown` call.
 *
 * Add a new theme by declaring a `FormatTokens` constant and registering
 * it in `FORMAT_THEMES` — do NOT change the default behaviour.
 */

export type FormatTokens = {
  colors: {
    text: string;
    muted: string;
    accent: string;
    accentStrong: string;
    accentAction: string;
    accentSoft: string;
    accentPale: string;
    surface: string;
    border: string;
    warning: string;
    warningSoft: string;
    danger: string;
    dangerSoft: string;
  };
  font: string;
  radius: {
    small: string;
    medium: string;
    large: string;
    pill: string;
  };
  shadow: string;
  border: string;
};

/** Default theme — warm-neutral WeChat palette. Preserved for back-compat. */
export const WECHAT_NATIVE_TOKENS: FormatTokens = {
  colors: {
    text: "#555555",
    muted: "#737373",
    accent: "#b3593b",
    accentStrong: "#9f482f",
    accentAction: "#b2583b",
    accentSoft: "#ead6cc",
    accentPale: "#f7f7f7",
    surface: "#faf9f5",
    border: "#dab1a1",
    warning: "#b7791f",
    warningSoft: "#fff8e8",
    danger: "#b44747",
    dangerSoft: "#fff1f1",
  },
  font: "-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei','Helvetica Neue',Arial,sans-serif",
  radius: {
    small: "8px",
    medium: "12px",
    large: "16px",
    pill: "999px",
  },
  shadow: "0 1px 2px rgba(0,0,0,0.16)",
  border: "1px solid rgba(202,202,199,0.18)",
};

/**
 * Claude (Anthropic) inspired theme — literary salon aesthetic.
 *
 * Sourced from the Claude design system: warm parchment canvas, terracotta
 * accent, exclusively warm-toned neutrals, serif headlines. Custom
 * Anthropic fonts are unavailable in WeChat, so headings fall back to
 * Georgia and body text to the system sans stack.
 */
export const CLAUDE_TOKENS: FormatTokens = {
  colors: {
    text: "#141413", // Anthropic Near Black — warmest "black"
    muted: "#5e5d59", // Olive Gray — warm secondary text
    accent: "#c96442", // Terracotta Brand — the single chromatic element
    accentStrong: "#9f482f", // deeper terracotta for emphasis
    accentAction: "#c96442", // CTA shares the brand accent
    accentSoft: "#f0eee6", // Border Cream — gentle accent wash
    accentPale: "#faf9f5", // Ivory — softest accent surface
    surface: "#f5f4ed", // Parchment — the warm canvas, never pure white
    border: "#e8e6dc", // Warm Sand border
    warning: "#b7791f", // warm amber, shared
    warningSoft: "#fff8e8",
    danger: "#b53333", // Error Crimson — warm red, not standard danger
    dangerSoft: "#fdf2f2",
  },
  font: "Georgia,'Times New Roman','Songti SC','PingFang SC',serif",
  radius: {
    small: "8px", // comfortably rounded
    medium: "12px", // generously rounded
    large: "16px", // very rounded — featured containers
    pill: "999px",
  },
  shadow: "0 0 0 1px #e8e6dc", // ring-based halo — Claude's signature depth
  border: "1px solid #e8e6dc", // warm sand border
};

export const WRITEFLOW_EDITORIAL_TOKENS: FormatTokens = {
  colors: {
    text: "#2a241f",
    muted: "#6f6258",
    accent: "#a45a3f",
    accentStrong: "#7e3f2d",
    accentAction: "#a45a3f",
    accentSoft: "#f4ebe4",
    accentPale: "#fbf7f2",
    surface: "#fffdf9",
    border: "#eaded3",
    warning: "#9a6a22",
    warningSoft: "#fff8e8",
    danger: "#a33a3a",
    dangerSoft: "#fff1f1",
  },
  font: "-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei','Helvetica Neue',Arial,sans-serif",
  radius: {
    small: "6px",
    medium: "8px",
    large: "8px",
    pill: "999px",
  },
  shadow: "none",
  border: "1px solid #eaded3",
};

export type FormatThemeId = "wechat-native" | "claude" | "writeflow-editorial";

export const FORMAT_THEMES: Record<FormatThemeId, FormatTokens> = {
  "wechat-native": WECHAT_NATIVE_TOKENS,
  claude: CLAUDE_TOKENS,
  "writeflow-editorial": WRITEFLOW_EDITORIAL_TOKENS,
};

let currentTokens: FormatTokens = WECHAT_NATIVE_TOKENS;

export function getFormatTokens(): FormatTokens {
  return currentTokens;
}

export function setFormatTokens(tokens: FormatTokens): void {
  currentTokens = tokens;
}

export function resetFormatTokens(): void {
  currentTokens = WECHAT_NATIVE_TOKENS;
}
