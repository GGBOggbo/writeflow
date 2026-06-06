import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProseText } from "./prose-text";

describe("ProseText", () => {
  it("renders an empty string as nothing", () => {
    const { container } = render(<ProseText content="" />);
    expect(container.innerHTML).toBe("");
  });

  it("splits content by double newlines into paragraphs", () => {
    render(<ProseText content={"第一段\n\n第二段\n\n第三段"} />);
    const paragraphs = screen.getAllByTestId("prose-paragraph");
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[0]).toHaveTextContent("第一段");
    expect(paragraphs[1]).toHaveTextContent("第二段");
    expect(paragraphs[2]).toHaveTextContent("第三段");
  });

  it("renders single-paragraph content without splitting", () => {
    render(<ProseText content="只有一段" />);
    const paragraphs = screen.getAllByTestId("prose-paragraph");
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0]).toHaveTextContent("只有一段");
  });

  it("collapses multiple blank lines into single paragraph breaks", () => {
    render(<ProseText content={"第一段\n\n\n\n第二段"} />);
    const paragraphs = screen.getAllByTestId("prose-paragraph");
    expect(paragraphs).toHaveLength(2);
  });

  it("preserves single newlines within a paragraph as spaces", () => {
    render(<ProseText content={"第一行\n第二行\n\n第二段"} />);
    const paragraphs = screen.getAllByTestId("prose-paragraph");
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]).toHaveTextContent("第一行 第二行");
  });
});
