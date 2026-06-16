import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkflowState } from "@/types/workflow";
import { WorkflowProvider } from "../workflow-context";
import { DraftStage } from "./draft-stage";

vi.mock("@/lib/ai/client", () => ({
  generateTopics: vi.fn(),
  generateBrief: vi.fn(),
  generateOutline: vi.fn(),
  generateDraft: vi.fn(),
  formatDraft: vi.fn(),
  completeDraftMaterials: vi.fn(),
  generateTitlesAndSummaries: vi.fn(),
}));

const draftState: Partial<WorkflowState> = {
  currentStep: "draft_review",
  draftVersions: [
    { id: "d1", label: "原稿", content: "这是原稿正文" },
    { id: "d2", label: "润色版", content: "这是润色版正文" },
  ],
  selectedDraftVersionId: "d1",
};

const markdownDraftState: Partial<WorkflowState> = {
  ...draftState,
  draftVersions: [
    { id: "d1", label: "原稿", content: "## 原稿标题\n\n这是 **原稿**。" },
    { id: "d2", label: "润色版", content: "## 润色标题\n\n这是润色版。" },
  ],
};

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

function renderWithState(ui: React.ReactElement, state: Partial<WorkflowState>) {
  window.localStorage.setItem(
    "ai-writing-mvp-workflow",
    JSON.stringify(state)
  );
  return render(<WorkflowProvider>{ui}</WorkflowProvider>);
}

describe("DraftStage", () => {
  it("renders draft versions as a horizontal tab row", async () => {
    renderWithState(<DraftStage />, draftState);

    expect(await screen.findByRole("button", { name: "原稿" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "润色版" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "原稿" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("switches the displayed draft body when a version tab is selected", async () => {
    const user = userEvent.setup();
    renderWithState(<DraftStage />, draftState);

    expect(
      await screen.findByRole("textbox", { name: "Markdown 正文" })
    ).toHaveValue("这是原稿正文");
    await user.click(screen.getByRole("button", { name: "润色版" }));
    await waitFor(() => {
      expect(
        screen.getByRole("textbox", { name: "Markdown 正文" })
      ).toHaveValue("这是润色版正文");
    });
  });

  it("shows the formatting panel beside the body", async () => {
    renderWithState(<DraftStage />, draftState);

    expect(
      await screen.findByRole("textbox", { name: "Markdown 正文" })
    ).toHaveValue("这是原稿正文");
    expect(screen.getByTestId("wechat-format-panel")).toBeInTheDocument();
  });

  it("passes advanced Markdown to the WeChat preview without paid formatting", async () => {
    renderWithState(<DraftStage />, {
      ...draftState,
      draftVersions: [
        {
          id: "d1",
          label: "高级模块版",
          content: `:::summary
highlight: 源正文已经结构化
body: 直接进入公众号预览。
:::`,
        },
      ],
    });

    const preview = await screen.findByLabelText("公众号排版预览");
    expect(preview.innerHTML).toContain('data-mpa-action-id="summary"');
    expect(screen.queryByRole("button", { name: /公众号排版，消耗/ })).toBeNull();
  });

  it("keeps the desktop comparison inside a fixed-height scroll workspace", async () => {
    renderWithState(<DraftStage />, draftState);

    await screen.findByRole("textbox", { name: "Markdown 正文" });
    expect(screen.getByTestId("draft-workspace")).toHaveClass(
      "xl:h-[1160px]"
    );
    expect(screen.getByTestId("draft-body-panel")).toHaveClass(
      "xl:min-h-0",
      "xl:overflow-hidden"
    );
    expect(screen.getByTestId("draft-scroll-area")).toHaveClass(
      "xl:min-h-0",
      "xl:flex-1",
      "xl:resize-none"
    );
  });

  it("shows the Markdown source editor by default", async () => {
    renderWithState(<DraftStage />, markdownDraftState);

    expect(
      await screen.findByRole("textbox", { name: "Markdown 正文" })
    ).toHaveValue(
      "## 原稿标题\n\n这是 **原稿**。"
    );
    expect(screen.getByRole("textbox", { name: "Markdown 正文" })).toHaveClass(
      "xl:min-h-0",
      "xl:flex-1",
      "xl:resize-none"
    );
    expect(screen.getByTestId("draft-editor-layout")).toHaveClass(
      "xl:min-h-0",
      "xl:flex-1",
      "xl:flex"
    );
    expect(screen.queryByRole("button", { name: "编辑正文" })).toBeNull();
    expect(screen.queryByRole("button", { name: "保存修改" })).toBeNull();
  });

  it("updates the WeChat preview immediately while Markdown is edited", async () => {
    const user = userEvent.setup();
    renderWithState(<DraftStage />, markdownDraftState);

    const editor = await screen.findByRole("textbox", {
      name: "Markdown 正文",
    });
    await user.clear(editor);
    await user.type(editor, "## 新标题\n\n新的 **正文**。");

    await waitFor(() => {
      const preview = screen.getByLabelText("公众号排版预览");
      expect(preview.innerHTML).toContain("新标题");
      expect(preview.innerHTML).toContain("<strong");
      expect(preview.innerHTML).toContain("正文");
    });
  });

  it("keeps the editor and preview aligned when switching versions", async () => {
    const user = userEvent.setup();
    renderWithState(<DraftStage />, markdownDraftState);

    await user.click(
      await screen.findByRole("button", { name: "润色版" })
    );

    await waitFor(() => {
      expect(
        screen.getByRole("textbox", { name: "Markdown 正文" })
      ).toHaveValue("## 润色标题\n\n这是润色版。");
      expect(screen.getByLabelText("公众号排版预览").innerHTML).toContain(
        "润色标题"
      );
    });
  });

  it("formats the active draft through the separate free AI action", async () => {
    const client = await import("@/lib/ai/client");
    vi.mocked(client.formatDraft).mockResolvedValueOnce({
      draft: {
        id: "d1-formatted",
        label: "排版版",
        content: "## 模型越新，排队越久\n\n正文。",
      },
    });
    const user = userEvent.setup();
    renderWithState(<DraftStage />, {
      ...draftState,
      draftVersions: [
        {
          id: "d1",
          label: "原稿",
          content: [
            "模型越新，排队越久",
            "上周二下午三点，我卡在一个 bug 上，想着用新模型救个急。",
            "国产AI套餐的算力潜规则",
            "你以为买了套餐就稳了？太天真了。不同档位的算力分配，水很深。",
          ].join("\n\n"),
        },
      ],
    });

    await user.click(
      await screen.findByRole("button", { name: "AI 编辑排版（免费）" })
    );

    await waitFor(() => {
      const editor = screen.getByRole("textbox", {
        name: "Markdown 正文",
      }) as HTMLTextAreaElement;
      expect(editor.value).toContain("## 模型越新，排队越久");
      expect(screen.getByRole("button", { name: "排版版" })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
    });
    expect(client.formatDraft).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        draft: expect.objectContaining({ id: "d1" }),
      }),
      expect.any(Function),
      expect.any(Function)
    );
  });

  it("keeps AI formatting in the editor header instead of workflow actions", async () => {
    renderWithState(<DraftStage />, draftState);

    const editorPanel = await screen.findByTestId("draft-body-panel");
    expect(
      within(editorPanel).getByRole("button", {
        name: "AI 编辑排版（免费）",
      })
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("draft-workflow-actions")).queryByRole(
        "button",
        { name: "AI 编辑排版（免费）" }
      )
    ).toBeNull();
    expect(
      screen.getByText(
        "AI 会保留原文主线，编辑阅读节奏并按内容选择模块；当前正文保留，不扣积分。"
      )
    ).toBeInTheDocument();
  });

  it("shows free AI material completion only for a draft with placeholders", async () => {
    renderWithState(<DraftStage />, {
      ...draftState,
      draftVersions: [
        {
          id: "d1",
          label: "原稿",
          content: "正文。【💡需要你补充：补充公开背景】",
        },
      ],
    });

    expect(
      await screen.findByRole("button", { name: "AI 补充素材（免费）" })
    ).toBeInTheDocument();
  });

  it("hides AI material completion when the active draft has no placeholder", async () => {
    renderWithState(<DraftStage />, draftState);

    await screen.findByRole("textbox", { name: "Markdown 正文" });
    expect(
      screen.queryByRole("button", { name: "AI 补充素材（免费）" })
    ).toBeNull();
  });

  it("disables AI material completion once a draft has already been completed", async () => {
    renderWithState(<DraftStage />, {
      ...draftState,
      draftVersions: [
        {
          id: "d1",
          label: "原稿",
          content: "正文。【💡需要你补充：补充公开背景】",
        },
        {
          id: "d1-materials-done",
          label: "AI 补充版",
          content: "已经补齐素材的完整正文。",
        },
      ],
      selectedDraftVersionId: "d1",
    });

    const button = await screen.findByRole("button", {
      name: "已补充素材",
    });
    expect(button).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "AI 补充素材（免费）" })
    ).toBeNull();
  });

  it("disables AI formatting while the active draft still has material placeholders", async () => {
    renderWithState(<DraftStage />, {
      ...draftState,
      draftVersions: [
        {
          id: "d1",
          label: "原稿",
          content: "正文。【💡需要你补充：补充公开背景】",
        },
      ],
    });

    const formatButton = await screen.findByRole("button", {
      name: "先补充素材再排版",
    });
    expect(formatButton).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "AI 编辑排版（免费）" })
    ).toBeNull();
  });

  it("enables AI formatting again once placeholders are gone", async () => {
    renderWithState(<DraftStage />, {
      ...draftState,
      draftVersions: [
        { id: "d1", label: "原稿", content: "已经补齐的完整正文。" },
      ],
    });

    expect(
      await screen.findByRole("button", { name: "AI 编辑排版（免费）" })
    ).toBeEnabled();
  });
});
