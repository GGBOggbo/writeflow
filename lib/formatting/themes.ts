import type { WechatFormatTheme } from "@/types/workflow";

export type WechatThemeTokens = {
  pageBackground: string;
  text: string;
  muted: string;
  accent: string;
  accentDark: string;
  accentSoft: string;
  headingText: string;
  headingRule: string;
  headingBackground: string;
  headingFont: string;
  textFont: string;
  quoteBackground: string;
  quoteText: string;
  quoteBorder: string;
  painBackground: string;
  painText: string;
  painBorder: string;
  listBackground: string;
  comparisonBackground: string;
  comparisonBorder: string;
  ctaBackground: string;
  ctaText: string;
  ctaBorder: string;
  divider: string;
  radius: string;
  cardShadow: string;
  cardRadius: string;
  ctaGradientFrom: string;
  ctaGradientTo: string;
};

export const WECHAT_THEME_TOKENS: Record<
  WechatFormatTheme,
  WechatThemeTokens
> = {
  "spring-fresh": {
    pageBackground: "#f5f8f5",
    text: "#3d4a3d",
    muted: "#78907d",
    accent: "#6b9b7a",
    accentDark: "#4a8058",
    accentSoft: "#edf4ed",
    headingText: "#4a8058",
    headingRule: "#8fbb99",
    headingBackground: "#ffffff",
    headingFont: "-apple-system,'PingFang SC','Microsoft YaHei',sans-serif",
    textFont: "-apple-system,'PingFang SC','Microsoft YaHei','Helvetica Neue',sans-serif",
    quoteBackground: "#e8f0e8",
    quoteText: "#3f684b",
    quoteBorder: "#6b9b7a",
    painBackground: "#fff8ed",
    painText: "#765336",
    painBorder: "#d99a58",
    listBackground: "#f7faf7",
    comparisonBackground: "#f8fbf8",
    comparisonBorder: "#b8d2bd",
    ctaBackground: "transparent",
    ctaText: "#ffffff",
    ctaBorder: "#8fbb99",
    divider: "#c9ddcd",
    radius: "16px",
    cardShadow: "0 12px 30px rgba(74,128,88,0.10), 0 2px 8px rgba(61,74,61,0.06)",
    cardRadius: "16px",
    ctaGradientFrom: "#7aaa86",
    ctaGradientTo: "#4a8058",
  },
  "autumn-warm": {
    pageBackground: "#faf9f5",
    text: "#4a413d",
    muted: "#8c766b",
    accent: "#d97758",
    accentDark: "#c06b4d",
    accentSoft: "#fef4e7",
    headingText: "#d97758",
    headingRule: "rgba(74,65,61,0.3)",
    headingBackground: "#ffffff",
    headingFont: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
    textFont: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
    quoteBackground: "#fef4e7",
    quoteText: "#4a413d",
    quoteBorder: "#d97758",
    painBackground: "#fef4e7",
    painText: "#4a413d",
    painBorder: "#d97758",
    listBackground: "#fffaf4",
    comparisonBackground: "#fffaf4",
    comparisonBorder: "rgba(74,65,61,0.18)",
    ctaBackground: "transparent",
    ctaText: "#ffffff",
    ctaBorder: "#d97758",
    divider: "rgba(74,65,61,0.1)",
    radius: "18px",
    cardShadow: "0 10px 30px rgba(0,0,0,0.04), 0 0 15px rgba(217,119,88,0.4)",
    cardRadius: "18px",
    ctaGradientFrom: "#df896d",
    ctaGradientTo: "#c06b4d",
  },
  "ocean-calm": {
    pageBackground: "#f0f4f8",
    text: "#3a4150",
    muted: "#718194",
    accent: "#4a7c9b",
    accentDark: "#3d6a8a",
    accentSoft: "#e8f0f8",
    headingText: "#3d6a8a",
    headingRule: "rgba(74,124,155,0.3)",
    headingBackground: "#ffffff",
    headingFont: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
    textFont: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
    quoteBackground: "#e8f0f8",
    quoteText: "#3a4150",
    quoteBorder: "#4a7c9b",
    painBackground: "#edf4f8",
    painText: "#3a4150",
    painBorder: "#4a7c9b",
    listBackground: "#f5f9fc",
    comparisonBackground: "#f5f9fc",
    comparisonBorder: "rgba(74,124,155,0.18)",
    ctaBackground: "transparent",
    ctaText: "#ffffff",
    ctaBorder: "#4a7c9b",
    divider: "rgba(74,124,155,0.25)",
    radius: "14px",
    cardShadow: "0 8px 28px rgba(58,65,80,0.06), 0 0 16px rgba(74,124,155,0.15)",
    cardRadius: "14px",
    ctaGradientFrom: "#5f8daa",
    ctaGradientTo: "#3d6a8a",
  },
  "claude-warm-paper": {
    pageBackground: "#f5f4ed",
    text: "#141413",
    muted: "#5e5d59",
    accent: "#c96442",
    accentDark: "#a84f35",
    accentSoft: "#e8e6dc",
    headingText: "#141413",
    headingRule: "#e8e6dc",
    headingBackground: "#faf9f5",
    headingFont: "Georgia,'Times New Roman',serif",
    textFont: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
    quoteBackground: "#e8e6dc",
    quoteText: "#141413",
    quoteBorder: "#c96442",
    painBackground: "#f2e8df",
    painText: "#4f352b",
    painBorder: "#c96442",
    listBackground: "#faf9f5",
    comparisonBackground: "#faf9f5",
    comparisonBorder: "#e8e6dc",
    ctaBackground: "transparent",
    ctaText: "#ffffff",
    ctaBorder: "#c96442",
    divider: "#e8e6dc",
    radius: "12px",
    cardShadow: "0 0 0 1px #f0eee6, 0 4px 24px rgba(0,0,0,0.05)",
    cardRadius: "12px",
    ctaGradientFrom: "#d47b5c",
    ctaGradientTo: "#a84f35",
  },
  "editorial-paper": {
    pageBackground: "#f5f4ed",
    text: "#383a35",
    muted: "#73766f",
    accent: "#53745e",
    accentDark: "#304b37",
    accentSoft: "#e9eee8",
    headingText: "#263e30",
    headingRule: "#d4d2c8",
    headingBackground: "transparent",
    headingFont: "-apple-system,'PingFang SC','Microsoft YaHei',sans-serif",
    textFont: "-apple-system,'PingFang SC','Microsoft YaHei','Helvetica Neue',sans-serif",
    quoteBackground: "transparent",
    quoteText: "#304b37",
    quoteBorder: "#53745e",
    painBackground: "#e9eee8",
    painText: "#3f4b42",
    painBorder: "#53745e",
    listBackground: "#efeee7",
    comparisonBackground: "#efeee7",
    comparisonBorder: "#c8cbc2",
    ctaBackground: "transparent",
    ctaText: "#304b37",
    ctaBorder: "#53745e",
    divider: "#d4d2c8",
    radius: "4px",
    cardShadow: "none",
    cardRadius: "0",
    ctaGradientFrom: "#53745e",
    ctaGradientTo: "#53745e",
  },
};
