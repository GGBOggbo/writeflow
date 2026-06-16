export const FREE_AI_THEME_IDS = [
  "spring-fresh",
  "autumn-warm",
  "ocean-calm",
  "claude-warm-paper",
] as const;

export type FreeAiThemeId = (typeof FREE_AI_THEME_IDS)[number];

const FONT_STACK =
  "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

type FreeAiThemeSpec = {
  id: FreeAiThemeId;
  label: string;
  version: "4.0";
  fontFamily: string;
  colors: {
    page: string;
    text: string;
    primary: string;
    secondary: string;
    quote: string;
  };
  layout: {
    maxWidth: "800px";
    pagePadding: "40px 10px";
    cardPadding: "25px";
    cardGap: "40px";
    bodyFontSize: "16px";
    lineHeight: string;
    letterSpacing: string;
  };
  card: {
    backgroundImage: string;
    backgroundSize: string;
    border: string;
    shadow: string;
    radius: string;
  };
  heading: {
    symbol: string;
    symbolShadow: string;
    fontFamily: string;
    fontWeight?: string;
    h2Color: string;
    h2Border: string;
    h3Color: string;
  };
  quote: {
    shadow: string;
  };
  divider: {
    background: string;
  };
};

export const FREE_AI_THEME_SPECS: Record<
  FreeAiThemeId,
  FreeAiThemeSpec
> = {
  "spring-fresh": {
    id: "spring-fresh",
    label: "春日清新",
    version: "4.0",
    fontFamily: FONT_STACK,
    colors: {
      page: "#f5f8f5",
      text: "#3d4a3d",
      primary: "#6b9b7a",
      secondary: "#4a8058",
      quote: "#e8f0e8",
    },
    layout: {
      maxWidth: "800px",
      pagePadding: "40px 10px",
      cardPadding: "25px",
      cardGap: "40px",
      bodyFontSize: "16px",
      lineHeight: "1.8",
      letterSpacing: "0.3px",
    },
    card: {
      backgroundImage:
        "radial-gradient(circle at 1px 1px, rgba(107, 155, 122, 0.08) 1px, transparent 0)",
      backgroundSize: "20px 20px",
      border: "1px solid rgba(107, 155, 122, 0.1)",
      shadow:
        "0 8px 24px rgba(74, 128, 88, 0.08), 0 0 12px rgba(107, 155, 122, 0.2)",
      radius: "16px",
    },
    heading: {
      symbol: "❀",
      symbolShadow: "0 0 10px rgba(107, 155, 122, 0.4)",
      fontFamily: FONT_STACK,
      h2Color: "#4a8058",
      h2Border: "1px dashed rgba(74, 128, 88, 0.25)",
      h3Color: "#4a8058",
    },
    quote: {
      shadow: "inset 0 0 12px rgba(107, 155, 122, 0.1)",
    },
    divider: {
      background:
        "linear-gradient(90deg, transparent, rgba(107, 155, 122, 0.3), transparent)",
    },
  },
  "autumn-warm": {
    id: "autumn-warm",
    label: "秋日暖光",
    version: "4.0",
    fontFamily: FONT_STACK,
    colors: {
      page: "#faf9f5",
      text: "#4a413d",
      primary: "#d97758",
      secondary: "#c06b4d",
      quote: "#fef4e7",
    },
    layout: {
      maxWidth: "800px",
      pagePadding: "40px 10px",
      cardPadding: "25px",
      cardGap: "40px",
      bodyFontSize: "16px",
      lineHeight: "1.75",
      letterSpacing: "0.5px",
    },
    card: {
      backgroundImage:
        "linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px)",
      backgroundSize: "20px 20px",
      border: "1px solid rgba(0,0,0,0.05)",
      shadow:
        "0 10px 30px rgba(0,0,0,0.04), 0 0 15px rgba(217,119,88,0.4)",
      radius: "18px",
    },
    heading: {
      symbol: "▶",
      symbolShadow: "0 0 12px rgba(217,119,88,0.5)",
      fontFamily: FONT_STACK,
      h2Color: "#d97758",
      h2Border: "1px dashed rgba(74,65,61,0.3)",
      h3Color: "#d97758",
    },
    quote: {
      shadow: "inset 0 0 15px rgba(217,119,88,0.1)",
    },
    divider: {
      background: "rgba(74,65,61,0.1)",
    },
  },
  "ocean-calm": {
    id: "ocean-calm",
    label: "深海静谧",
    version: "4.0",
    fontFamily: FONT_STACK,
    colors: {
      page: "#f0f4f8",
      text: "#3a4150",
      primary: "#4a7c9b",
      secondary: "#3d6a8a",
      quote: "#e8f0f8",
    },
    layout: {
      maxWidth: "800px",
      pagePadding: "40px 10px",
      cardPadding: "25px",
      cardGap: "40px",
      bodyFontSize: "16px",
      lineHeight: "1.8",
      letterSpacing: "0.2px",
    },
    card: {
      backgroundImage:
        "linear-gradient(rgba(74,124,155,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(74,124,155,0.03) 1px, transparent 1px)",
      backgroundSize: "24px 24px",
      border: "1px solid rgba(74,124,155,0.08)",
      shadow:
        "0 8px 28px rgba(58,65,80,0.06), 0 0 16px rgba(74,124,155,0.15)",
      radius: "14px",
    },
    heading: {
      symbol: "◆",
      symbolShadow: "0 0 10px rgba(74,124,155,0.4)",
      fontFamily: FONT_STACK,
      h2Color: "#3d6a8a",
      h2Border: "1px dashed rgba(74,124,155,0.3)",
      h3Color: "#3d6a8a",
    },
    quote: {
      shadow: "inset 0 0 12px rgba(74,124,155,0.08)",
    },
    divider: {
      background:
        "linear-gradient(90deg, transparent, rgba(74,124,155,0.25), transparent)",
    },
  },
  "claude-warm-paper": {
    id: "claude-warm-paper",
    label: "Claude 暖纸",
    version: "4.0",
    fontFamily: FONT_STACK,
    colors: {
      page: "#f5f4ed",
      text: "#141413",
      primary: "#c96442",
      secondary: "#5e5d59",
      quote: "#e8e6dc",
    },
    layout: {
      maxWidth: "800px",
      pagePadding: "40px 10px",
      cardPadding: "25px",
      cardGap: "40px",
      bodyFontSize: "16px",
      lineHeight: "1.8",
      letterSpacing: "0.1px",
    },
    card: {
      backgroundImage: "none",
      backgroundSize: "auto",
      border: "1px solid #f0eee6",
      shadow: "0 0 0 1px #f0eee6, 0 4px 24px rgba(0,0,0,0.05)",
      radius: "12px",
    },
    heading: {
      symbol: "—",
      symbolShadow: "none",
      fontFamily: "Georgia,'Times New Roman',serif",
      fontWeight: "500",
      h2Color: "#141413",
      h2Border: "1px solid #e8e6dc",
      h3Color: "#141413",
    },
    quote: {
      shadow: "inset 0 0 0 1px #f0eee6",
    },
    divider: {
      background: "#e8e6dc",
    },
  },
};

export function isFreeAiTheme(theme: string): theme is FreeAiThemeId {
  return FREE_AI_THEME_IDS.includes(theme as FreeAiThemeId);
}
