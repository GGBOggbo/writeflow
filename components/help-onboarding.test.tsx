import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import {
  HELP_ONBOARDING_OPEN_EVENT,
  HELP_ONBOARDING_STORAGE_KEY,
  HelpOnboarding,
} from "./help-onboarding";

describe("HelpOnboarding", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("appears on first visit", () => {
    render(<HelpOnboarding />);

    expect(
      screen.getByRole("dialog", { name: /先看顶部流水线/i })
    ).toBeInTheDocument();
    expect(screen.getByText("1 / 4")).toBeInTheDocument();
  });

  it("highlights the real page target for the current step", async () => {
    render(
      <>
        <div data-onboarding-target="workflow-pipeline">流水线区域</div>
        <HelpOnboarding />
      </>
    );

    await waitFor(() => {
      expect(screen.getByText("流水线区域")).toHaveClass(
        "help-onboarding-target--active"
      );
    });
  });

  it("stores dismissal when skipped", async () => {
    const user = userEvent.setup();
    render(<HelpOnboarding />);

    await user.click(screen.getByRole("button", { name: "跳过" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(HELP_ONBOARDING_STORAGE_KEY)).toBe(
      "done"
    );
  });

  it("advances through steps", async () => {
    const user = userEvent.setup();
    render(<HelpOnboarding />);

    await user.click(screen.getByRole("button", { name: "下一步" }));

    expect(
      screen.getByRole("dialog", { name: /这里看剩余积分/i })
    ).toBeInTheDocument();
    expect(screen.getByText("2 / 4")).toBeInTheDocument();
  });

  it("stores completion on the final step", async () => {
    const user = userEvent.setup();
    render(<HelpOnboarding />);

    await user.click(screen.getByRole("button", { name: "下一步" }));
    await user.click(screen.getByRole("button", { name: "下一步" }));
    await user.click(screen.getByRole("button", { name: "下一步" }));
    await user.click(screen.getByRole("button", { name: "开始使用" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(HELP_ONBOARDING_STORAGE_KEY)).toBe(
      "done"
    );
  });

  it("stays hidden after dismissal", () => {
    window.localStorage.setItem(HELP_ONBOARDING_STORAGE_KEY, "done");

    render(<HelpOnboarding />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("can be reopened manually for returning users", async () => {
    window.localStorage.setItem(HELP_ONBOARDING_STORAGE_KEY, "done");
    render(<HelpOnboarding />);

    window.dispatchEvent(new Event(HELP_ONBOARDING_OPEN_EVENT));

    expect(
      await screen.findByRole("dialog", { name: /先看顶部流水线/i })
    ).toBeInTheDocument();
  });
});
