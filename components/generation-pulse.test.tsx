import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  GenerationPulse,
  getGenerationPulseSteps,
} from "./generation-pulse";

describe("GenerationPulse", () => {
  it("maps topic generation to the search and enrichment timeline", () => {
    const steps = getGenerationPulseSteps("generate_topics");

    expect(steps.map((step) => step.label)).toEqual([
      "提炼搜索词",
      "微信搜一搜",
      "8 篇建档",
      "5 篇互动验证",
      "2 篇深拆",
      "生成选题",
    ]);
  });

  it("shows benchmark summary progress while generating drafts", () => {
    render(
      <GenerationPulse
        loading
        action="generate_drafts"
        message="正在总结对标文章并生成正文版本..."
      />
    );

    expect(screen.getByText("生成导演台")).toBeInTheDocument();
    expect(screen.getByText("AI 总结对标文")).toBeInTheDocument();
    expect(screen.getByText("吸收评论卡点")).toBeInTheDocument();
    expect(screen.getByText("生成正文初稿")).toBeInTheDocument();
  });

  it("marks steps from real backend progress events instead of guessing progress", () => {
    render(
      <GenerationPulse
        loading
        action="generate_topics"
        message="正在联网检索并生成选题方向..."
        events={[
          {
            stepId: "search_query_built",
            label: "提炼搜索词",
            detail: "AI 副业 痛点",
          },
          {
            stepId: "web_search_started",
            label: "微信搜一搜",
          },
        ]}
      />
    );

    expect(screen.getByText("提炼搜索词").closest("li")).toHaveClass(
      "generation-pulse__step--done"
    );
    expect(screen.getByText("微信搜一搜").closest("li")).toHaveClass(
      "generation-pulse__step--active"
    );
    expect(screen.getByText("8 篇建档").closest("li")).toHaveClass(
      "generation-pulse__step--waiting"
    );
  });

  it("stays hidden when no request is running", () => {
    const { container } = render(<GenerationPulse loading={false} />);

    expect(container).toBeEmptyDOMElement();
  });
});
