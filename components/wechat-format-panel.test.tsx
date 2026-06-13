import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WechatFormatPanel } from "./wechat-format-panel";

vi.mock("@/lib/copy/copy-rich-html", () => ({
  copyRichHtml: vi.fn(),
}));

describe("WechatFormatPanel", () => {
  it("offers paid generation before formatting exists", async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();

    render(
      <WechatFormatPanel
        draftLabel="原始版"
        formatting={undefined}
        loading={false}
        canGenerate
        onGenerate={onGenerate}
        onThemeChange={vi.fn()}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "公众号排版，消耗 1 积分" })
    );
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it("disables generation while another workflow request is running", () => {
    render(
      <WechatFormatPanel
        draftLabel="原始版"
        formatting={undefined}
        loading={false}
        disabled
        canGenerate
        onGenerate={vi.fn()}
        onThemeChange={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: "公众号排版，消耗 1 积分" })
    ).toBeDisabled();
  });

  it("switches among three local themes and renders an editorial preview", async () => {
    const user = userEvent.setup();
    const onThemeChange = vi.fn();

    render(
      <WechatFormatPanel
        draftLabel="去 AI 版"
        formatting={{
          draftVersionId: "draft-1",
          blocks: [
            { id: "h1", type: "heading", text: "先把主流程跑通" },
            { id: "p1", type: "paragraph", text: "正文内容。" },
          ],
          selectedTheme: "professional-blue",
          generatedAt: "2026-06-13T00:00:00.000Z",
        }}
        loading={false}
        canGenerate
        onGenerate={vi.fn()}
        onThemeChange={onThemeChange}
      />
    );

    expect(screen.getByText("当前正文：去 AI 版")).toBeInTheDocument();
    expect(screen.getByText("文章预览 · 可滚动")).toBeInTheDocument();
    expect(screen.getByTestId("wechat-format-panel")).not.toHaveClass(
      "rounded-[28px]"
    );
    expect(screen.getByLabelText("公众号排版预览")).toHaveAttribute(
      "data-theme",
      "professional-blue"
    );
    await user.click(screen.getByRole("button", { name: "清爽青绿" }));
    expect(onThemeChange).toHaveBeenCalledWith("fresh-teal");
    expect(screen.getByRole("button", { name: "专业蓝" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "温暖橙" })).toBeInTheDocument();
  });

  it("copies rich html when the copy button is clicked", async () => {
    const user = userEvent.setup();
    const { copyRichHtml } = await import("@/lib/copy/copy-rich-html");
    vi.mocked(copyRichHtml).mockResolvedValue(undefined);

    render(
      <WechatFormatPanel
        draftLabel="去 AI 版"
        formatting={{
          draftVersionId: "draft-1",
          blocks: [
            { id: "h1", type: "heading", text: "先把主流程跑通" },
            { id: "p1", type: "paragraph", text: "正文内容。" },
          ],
          selectedTheme: "professional-blue",
          generatedAt: "2026-06-13T00:00:00.000Z",
        }}
        loading={false}
        canGenerate
        onGenerate={vi.fn()}
        onThemeChange={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "复制到公众号编辑器" }));
    await waitFor(() => {
      expect(copyRichHtml).toHaveBeenCalledTimes(1);
    });
  });
});
