import { describe, expect, it } from "vitest";
import {
  FREE_AI_THEME_IDS,
  FREE_AI_THEME_SPECS,
} from "./free-ai-themes";

describe("FREE_AI_THEME_SPECS", () => {
  it("distills the three public md2wechat free AI themes", () => {
    expect(FREE_AI_THEME_IDS).toEqual([
      "spring-fresh",
      "autumn-warm",
      "ocean-calm",
      "claude-warm-paper",
    ]);

    for (const theme of FREE_AI_THEME_IDS) {
      expect(FREE_AI_THEME_SPECS[theme]).toMatchObject({
        id: theme,
        version: "4.0",
        layout: {
          maxWidth: "800px",
          pagePadding: "40px 10px",
          cardPadding: "25px",
          cardGap: "40px",
          bodyFontSize: "16px",
        },
      });
    }
  });

  it("preserves each prompt's distinctive visual rules", () => {
    expect(FREE_AI_THEME_SPECS["spring-fresh"]).toMatchObject({
      label: "春日清新",
      colors: {
        page: "#f5f8f5",
        text: "#3d4a3d",
        primary: "#6b9b7a",
        secondary: "#4a8058",
        quote: "#e8f0e8",
      },
      card: {
        backgroundSize: "20px 20px",
        radius: "16px",
      },
      heading: { symbol: "❀" },
    });

    expect(FREE_AI_THEME_SPECS["autumn-warm"]).toMatchObject({
      label: "秋日暖光",
      colors: {
        page: "#faf9f5",
        text: "#4a413d",
        primary: "#d97758",
        secondary: "#c06b4d",
        quote: "#fef4e7",
      },
      card: {
        backgroundSize: "20px 20px",
        radius: "18px",
      },
      heading: { symbol: "▶" },
    });

    expect(FREE_AI_THEME_SPECS["ocean-calm"]).toMatchObject({
      label: "深海静谧",
      colors: {
        page: "#f0f4f8",
        text: "#3a4150",
        primary: "#4a7c9b",
        secondary: "#3d6a8a",
        quote: "#e8f0f8",
      },
      card: {
        backgroundSize: "24px 24px",
        radius: "14px",
      },
      heading: { symbol: "◆" },
    });

    expect(FREE_AI_THEME_SPECS["claude-warm-paper"]).toMatchObject({
      label: "Claude 暖纸",
      colors: {
        page: "#f5f4ed",
        text: "#141413",
        primary: "#c96442",
        secondary: "#5e5d59",
        quote: "#e8e6dc",
      },
      card: {
        backgroundImage: "none",
        radius: "12px",
        shadow: "0 0 0 1px #f0eee6, 0 4px 24px rgba(0,0,0,0.05)",
      },
      heading: {
        symbol: "—",
        fontFamily: "Georgia,'Times New Roman',serif",
      },
    });
  });
});
