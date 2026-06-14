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
  "professional-blue": {
    pageBackground: "#ffffff",
    text: "#455468",
    muted: "#78889a",
    accent: "#3b6f9e",
    accentDark: "#183a5a",
    accentSoft: "#edf4f8",
    headingText: "#172b42",
    headingRule: "#3b6f9e",
    headingBackground: "#ffffff",
    headingFont: "-apple-system,'PingFang SC','Microsoft YaHei',sans-serif",
    textFont: "-apple-system,'PingFang SC','Microsoft YaHei','Helvetica Neue',sans-serif",
    quoteBackground: "#edf4f8",
    quoteText: "#183a5a",
    quoteBorder: "#3b6f9e",
    painBackground: "#fff7ed",
    painText: "#7c2d12",
    painBorder: "#ea580c",
    listBackground: "#ffffff",
    comparisonBackground: "#ffffff",
    comparisonBorder: "#b8c9d8",
    ctaBackground: "transparent",
    ctaText: "#244866",
    ctaBorder: "#b8cfe1",
    divider: "#dbe5ec",
    radius: "8px",
    cardShadow: "0 8px 24px rgba(24,58,90,0.08), 0 1px 3px rgba(24,58,90,0.04)",
    cardRadius: "12px",
    ctaGradientFrom: "#3b6f9e",
    ctaGradientTo: "#183a5a",
  },
  "warm-orange": {
    pageBackground: "#fffdf9",
    text: "#554d46",
    muted: "#9a897a",
    accent: "#ef6a3a",
    accentDark: "#6f321e",
    accentSoft: "#fff4ed",
    headingText: "#302a25",
    headingRule: "#ef6a3a",
    headingBackground: "#fffdf9",
    headingFont: "Georgia,'Songti SC','STSong',serif",
    textFont: "-apple-system,'PingFang SC','Microsoft YaHei','Helvetica Neue',sans-serif",
    quoteBackground: "#fff4ed",
    quoteText: "#6f321e",
    quoteBorder: "#ef6a3a",
    painBackground: "#fff4ed",
    painText: "#7b402a",
    painBorder: "#e3572b",
    listBackground: "#ffffff",
    comparisonBackground: "#ffffff",
    comparisonBorder: "#edc4ae",
    ctaBackground: "transparent",
    ctaText: "#6f321e",
    ctaBorder: "#f0c3ad",
    divider: "#eadfd7",
    radius: "14px",
    cardShadow: "0 8px 24px rgba(111,50,30,0.08), 0 1px 3px rgba(111,50,30,0.04)",
    cardRadius: "12px",
    ctaGradientFrom: "#ef6a3a",
    ctaGradientTo: "#6f321e",
  },
  "fresh-teal": {
    pageBackground: "#fbfefd",
    text: "#405b57",
    muted: "#76928d",
    accent: "#0f766e",
    accentDark: "#164e45",
    accentSoft: "#ecfdf5",
    headingText: "#164e45",
    headingRule: "#0f766e",
    headingBackground: "#f0fdfa",
    headingFont: "-apple-system,'PingFang SC','Microsoft YaHei',sans-serif",
    textFont: "-apple-system,'PingFang SC','Microsoft YaHei','Helvetica Neue',sans-serif",
    quoteBackground: "#ecfdf5",
    quoteText: "#164e45",
    quoteBorder: "#0f766e",
    painBackground: "#fff7ed",
    painText: "#7c2d12",
    painBorder: "#f97316",
    listBackground: "#ffffff",
    comparisonBackground: "#ffffff",
    comparisonBorder: "#99d9cf",
    ctaBackground: "transparent",
    ctaText: "#0f766e",
    ctaBorder: "#a7e3d7",
    divider: "#d6ebe7",
    radius: "16px",
    cardShadow: "0 8px 24px rgba(22,78,69,0.08), 0 1px 3px rgba(22,78,69,0.04)",
    cardRadius: "12px",
    ctaGradientFrom: "#0f766e",
    ctaGradientTo: "#164e45",
  },
};
