import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  HELP_ONBOARDING_STORAGE_KEY,
  getHelpOnboardingStorageKey,
} from "./help-onboarding";
import { WorkflowProvider } from "./workflow-context";
import { WorkspaceShell } from "./workspace-shell";

describe("WorkspaceShell", () => {
  it("renders chat and manuscript regions", () => {
    render(
      <WorkflowProvider>
        <WorkspaceShell />
      </WorkflowProvider>
    );

    expect(screen.getByText(/主编台/i)).toBeInTheDocument();
    expect(screen.getByText(/成稿工作台/i)).toBeInTheDocument();
  });

  it("keeps detailed editor guidance behind a compact disclosure", () => {
    render(
      <WorkflowProvider>
        <WorkspaceShell />
      </WorkflowProvider>
    );

    expect(screen.getByText(/展开阶段说明/i)).toBeInTheDocument();
  });

  it("shows a prominent credit balance card", () => {
    render(
      <WorkflowProvider
        initialCreditBalance={{ unlimited: false, remaining: 5 }}
      >
        <WorkspaceShell />
      </WorkflowProvider>
    );

    expect(screen.getByText("剩余积分")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(
      screen.getByText("每阶段首次免费，重新生成扣 0.05 积分")
    ).toBeInTheDocument();
  });

  it("lets returning users reopen the guided tour", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(HELP_ONBOARDING_STORAGE_KEY, "done");

    render(
      <WorkflowProvider>
        <WorkspaceShell />
      </WorkflowProvider>
    );

    await user.click(screen.getByRole("button", { name: "查看导览" }));

    expect(
      await screen.findByRole("dialog", { name: /先看顶部流水线/i })
    ).toBeInTheDocument();
  });

  it("shows the guided tour for a user who has not completed it", () => {
    window.localStorage.setItem(HELP_ONBOARDING_STORAGE_KEY, "done");
    window.localStorage.setItem(getHelpOnboardingStorageKey("user-a"), "done");

    render(
      <WorkflowProvider storageOwnerKey="user-b">
        <WorkspaceShell />
      </WorkflowProvider>
    );

    expect(
      screen.getByRole("dialog", { name: /先看顶部流水线/i })
    ).toBeInTheDocument();
  });

  it("does not treat zero balance as a universal generation blocker", async () => {
    const user = userEvent.setup();

    render(
      <WorkflowProvider
        initialCreditBalance={{ unlimited: false, remaining: 0 }}
      >
        <WorkspaceShell />
      </WorkflowProvider>
    );

    expect(
      screen.getByText("每阶段首次免费，重新生成扣 0.05 积分")
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("核心想法"), "写一个新选题");

    expect(
      screen.getByRole("button", { name: /生成选题方向/i })
    ).not.toBeDisabled();
  });
});
