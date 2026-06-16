import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  HELP_ONBOARDING_OPEN_EVENT,
  HELP_ONBOARDING_STORAGE_KEY,
  getHelpOnboardingStorageKey,
  HelpOnboarding,
} from "./help-onboarding";

describe("HelpOnboarding", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it("positions the guide card in viewport coordinates after scrolling", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 720,
    });
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 400,
    });

    const rect = ({
      top,
      left,
      width,
      height,
    }: {
      top: number;
      left: number;
      width: number;
      height: number;
    }) =>
      ({
        top,
        left,
        width,
        height,
        bottom: top + height,
        right: left + width,
        x: left,
        y: top,
        toJSON: () => ({}),
      }) as DOMRect;

    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function getBoundingClientRect(this: HTMLElement) {
        if (this.classList.contains("help-onboarding-card")) {
          return rect({ top: 0, left: 0, width: 440, height: 280 });
        }

        if (this.getAttribute("data-onboarding-target") === "workflow-pipeline") {
          return rect({ top: 80, left: 40, width: 700, height: 120 });
        }

        return rect({ top: 0, left: 0, width: 0, height: 0 });
      }
    );

    render(
      <>
        <div data-onboarding-target="workflow-pipeline">流水线区域</div>
        <HelpOnboarding />
      </>
    );

    const card = screen.getByRole("dialog", { name: /先看顶部流水线/i });

    await waitFor(() => {
      expect(card.style.getPropertyValue("--help-onboarding-card-top")).toBe(
        "228px"
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

  it("stores dismissal separately for each signed-in user", async () => {
    const user = userEvent.setup();
    const userAKey = getHelpOnboardingStorageKey("user-a");
    const userBKey = getHelpOnboardingStorageKey("user-b");

    const { rerender } = render(
      <HelpOnboarding key="user-a" storageOwnerKey="user-a" />
    );

    await user.click(screen.getByRole("button", { name: "跳过" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(userAKey)).toBe("done");
    expect(window.localStorage.getItem(userBKey)).toBeNull();

    rerender(<HelpOnboarding key="user-b" storageOwnerKey="user-b" />);

    expect(
      await screen.findByRole("dialog", { name: /先看顶部流水线/i })
    ).toBeInTheDocument();
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
    window.localStorage.setItem(getHelpOnboardingStorageKey("user-a"), "done");

    render(<HelpOnboarding storageOwnerKey="user-a" />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("can be reopened manually for returning users", async () => {
    window.localStorage.setItem(getHelpOnboardingStorageKey("user-a"), "done");
    render(<HelpOnboarding storageOwnerKey="user-a" />);

    window.dispatchEvent(new Event(HELP_ONBOARDING_OPEN_EVENT));

    expect(
      await screen.findByRole("dialog", { name: /先看顶部流水线/i })
    ).toBeInTheDocument();
  });
});
