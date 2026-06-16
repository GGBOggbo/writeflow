import { createRef } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WechatFormatPanel } from "./wechat-format-panel";

vi.mock("@/lib/copy/copy-rich-html", () => ({
  copyRichHtml: vi.fn(),
}));

describe("WechatFormatPanel", () => {
  it("renders ordinary Markdown locally without paid formatting", () => {
    render(
      <WechatFormatPanel
        draftLabel="原始版"
        content="## 本地预览标题\n\n普通正文"
      />
    );

    const preview = screen.getByLabelText("公众号排版预览");
    expect(preview.innerHTML).toContain("本地预览标题");
    expect(preview).toHaveAttribute("data-theme", "wechat-native");
    expect(screen.queryByText(/消耗 1 积分/)).toBeNull();
  });

  it("does not expose AI formatting or theme selection controls", () => {
    render(
      <WechatFormatPanel
        draftLabel="原始版"
        content="## 标题\n\n正文"
      />
    );

    expect(screen.queryByRole("button", { name: /公众号排版/ })).toBeNull();
    expect(screen.queryByRole("group", { name: "选择主题" })).toBeNull();
  });

  it("keeps the local preview layout and scroll synchronization", async () => {
    const user = userEvent.setup();
    const onToggleScrollSync = vi.fn();
    const onPreviewScroll = vi.fn();
    const previewScrollRef = createRef<HTMLDivElement>();

    render(
      <WechatFormatPanel
        draftLabel="原始版"
        content="## 先把主流程跑通\n\n正文内容。"
        previewScrollRef={previewScrollRef}
        onPreviewScroll={onPreviewScroll}
        scrollSyncEnabled
        onToggleScrollSync={onToggleScrollSync}
      />
    );

    expect(screen.getByText("当前正文：原始版")).toBeInTheDocument();
    expect(screen.getByText("文章预览 · 可滚动")).toBeInTheDocument();
    expect(screen.getByTestId("wechat-format-panel")).not.toHaveClass(
      "rounded-[28px]"
    );
    expect(screen.getByTestId("wechat-preview-layout")).toHaveClass(
      "min-h-0",
      "flex-1"
    );
    expect(screen.getByTestId("pro-max-device-frame")).toHaveClass(
      "h-[952px]",
      "w-[450px]",
      "max-w-full",
      "bg-[linear-gradient(135deg,#e4e7ec_0%,#d5d9e2_20%,#eef0f5_50%,#d8dce5_80%,#c5cbd6_100%)]"
    );
    expect(screen.getByTestId("pro-max-device-frame")).not.toHaveClass(
      "bg-[linear-gradient(145deg,#282a2e_0%,#111317_45%,#35383d_100%)]"
    );
    expect(screen.getByTestId("pro-max-device-screen")).toHaveClass(
      "h-full",
      "min-h-0",
      "overflow-hidden"
    );
    expect(screen.queryByTestId("pro-max-preview-canvas")).toBeNull();
    expect(screen.queryByTestId("pro-max-preview-placeholder")).toBeNull();
    expect(screen.getByLabelText("公众号排版预览")).toHaveAttribute(
      "data-theme",
      "wechat-native"
    );
    expect(screen.getByLabelText("公众号排版预览")).toHaveClass(
      "h-full",
      "overflow-y-auto",
      "overscroll-contain"
    );
    expect(screen.getByLabelText("公众号排版预览")).not.toHaveClass(
      "max-h-[480px]"
    );
    expect(previewScrollRef.current).toBe(
      screen.getByLabelText("公众号排版预览")
    );
    fireEvent.scroll(screen.getByLabelText("公众号排版预览"));
    expect(onPreviewScroll).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "滚动同步开" })
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("group", { name: "选择主题" })).toBeNull();
    expect(screen.getByTestId("wechat-preview-footer")).toContainElement(
      screen.getByRole("button", { name: "复制到公众号编辑器" })
    );

    await user.click(screen.getByRole("button", { name: "滚动同步开" }));
    expect(onToggleScrollSync).toHaveBeenCalledTimes(1);
  });

  it("copies rich html when the copy button is clicked", async () => {
    const user = userEvent.setup();
    const { copyRichHtml } = await import("@/lib/copy/copy-rich-html");
    vi.mocked(copyRichHtml).mockResolvedValue(undefined);

    render(
      <WechatFormatPanel
        draftLabel="原始版"
        content="## 先把主流程跑通\n\n正文内容。"
      />
    );

    await user.click(screen.getByRole("button", { name: "复制到公众号编辑器" }));
    await waitFor(() => {
      expect(copyRichHtml).toHaveBeenCalledTimes(1);
    });
  });

  it("blocks copying while material placeholders are still unresolved", async () => {
    const user = userEvent.setup();
    const { copyRichHtml } = await import("@/lib/copy/copy-rich-html");
    vi.mocked(copyRichHtml).mockClear();
    vi.mocked(copyRichHtml).mockResolvedValue(undefined);

    render(
      <WechatFormatPanel
        draftLabel="原始版"
        content="正文。\n\n【💡需要你补充：补充真实经历】"
      />
    );

    const copyButton = screen.getByRole("button", {
      name: "请先补完真实素材",
    });
    expect(copyButton).toBeDisabled();
    expect(screen.getByText("请先补完真实素材后再复制。")).toBeInTheDocument();

    await user.click(copyButton);
    expect(copyRichHtml).not.toHaveBeenCalled();
  });

  it("renders advanced source Markdown without requiring paid formatting", () => {
    render(
      <WechatFormatPanel
        draftLabel="高级模块版"
        content={`:::summary
highlight: 先把结构搭稳
body: 再让主题接管气质。
:::`}
      />
    );

    const preview = screen.getByLabelText("公众号排版预览");
    expect(preview.innerHTML).toContain('data-mpa-action-id="summary"');
    expect(preview).toHaveAttribute("data-theme", "wechat-native");
    expect(screen.queryByRole("button", { name: /公众号排版/ })).toBeNull();
    expect(screen.queryByRole("group", { name: "选择主题" })).toBeNull();
  });

  it("copies advanced HTML with the original Markdown as plain text", async () => {
    const user = userEvent.setup();
    const { copyRichHtml } = await import("@/lib/copy/copy-rich-html");
    vi.mocked(copyRichHtml).mockResolvedValue(undefined);
    const content = `:::cta
title: 从这套高级模块开始
:::`;

    render(
      <WechatFormatPanel
        draftLabel="高级模块版"
        content={content}
      />
    );

    await user.click(screen.getByRole("button", { name: "复制到公众号编辑器" }));
    await waitFor(() => {
      expect(copyRichHtml).toHaveBeenCalledWith(
        expect.stringContaining('data-mpa-action-id="cta"'),
        content
      );
    });
  });
});
