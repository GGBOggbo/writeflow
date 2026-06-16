import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  GenerationPulse,
  getGenerationPulseSteps,
} from "./generation-pulse";

describe("GenerationPulse", () => {
  it("presents topic generation as five editorial judgments", () => {
    const steps = getGenerationPulseSteps("generate_topics");

    expect(steps.map((step) => step.label)).toEqual([
      "理解创作意图",
      "看清同类内容",
      "寻找真实信号",
      "拆出有效打法",
      "策划你的切口",
    ]);
  });

  it("uses editorial framing while topics are being generated", () => {
    render(
      <GenerationPulse
        loading
        action="generate_topics"
        message="正在联网检索并生成选题方向..."
      />
    );

    expect(screen.getByText("主编正在判断")).toBeInTheDocument();
    expect(
      screen.getByText("先看清外面怎么写，再替你寻找不撞车的切口。")
    ).toBeInTheDocument();
    expect(screen.queryByText("微信搜一搜")).not.toBeInTheDocument();
    expect(screen.queryByText(/篇互动验证/)).not.toBeInTheDocument();
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
    expect(screen.queryByText("去掉机器腔")).not.toBeInTheDocument();
  });


  it("shows a dedicated timeline for free AI Markdown formatting", () => {
    render(
      <GenerationPulse
        loading
        action="format_draft"
        message="正在用 AI 整理 Markdown 和模块排版..."
      />
    );

    expect(screen.getByText("理解正文节奏")).toBeInTheDocument();
    expect(screen.getByText("整理 Markdown 与模块")).toBeInTheDocument();
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
            label: "拆解命题",
            detail: "AI 副业 痛点",
          },
          {
            stepId: "web_search_started",
            label: "扫描参考池",
          },
        ]}
      />
    );

    expect(screen.getByText("看清同类内容").closest("li")).toHaveClass(
      "generation-pulse__step--active"
    );
    expect(screen.getByText("寻找真实信号").closest("li")).toHaveClass(
      "generation-pulse__step--waiting"
    );
  });

  it("stays hidden when no request is running", () => {
    const { container } = render(<GenerationPulse loading={false} />);

    expect(container).toBeEmptyDOMElement();
  });
});
