import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownArticle } from "./markdown-article";

describe("MarkdownArticle", () => {
  it("shows rendered GFM without exposing source markers", () => {
    const { container } = render(
      <MarkdownArticle content={"## 一个标题\n\n这是 **重点**。"} />
    );

    expect(screen.getByRole("heading", { name: "一个标题" })).toBeInTheDocument();
    expect(screen.getByText("重点").tagName).toBe("STRONG");
    expect(container).not.toHaveTextContent("## 一个标题");
    expect(container).not.toHaveTextContent("**重点**");
  });
});
