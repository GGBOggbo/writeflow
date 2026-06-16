"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

export const HELP_ONBOARDING_STORAGE_KEY = "editorial-help-onboarding:v1";
export const HELP_ONBOARDING_OPEN_EVENT = "editorial-help-onboarding:open";

const onboardingSteps = [
  {
    eyebrow: "01 / 流程位置",
    title: "先看顶部流水线",
    body: "这里显示整篇稿件会经过哪些阶段：想法、选题、提纲、大纲、正文、标题摘要、定稿。深色卡片就是你当前所在的位置。",
    marker: "流水线",
    target: "workflow-pipeline",
  },
  {
    eyebrow: "02 / 积分位置",
    title: "这里看剩余积分",
    body: "右上角这张卡显示当前还能生成多少次。普通生成每次消耗 1 积分；如果没有积分，生成按钮会自动变成不可用。",
    marker: "积分",
    target: "credits",
  },
  {
    eyebrow: "03 / 输入位置",
    title: "在这里输入核心想法",
    body: "第一步不用写标题。把你想讨论的问题、读者和为什么值得写讲清楚，后面系统会把它收敛成可选题方向。",
    marker: "输入",
    target: "idea-input",
  },
  {
    eyebrow: "04 / 联网搜索",
    title: "按需开启联网搜索",
    body: "这个开关只影响选题阶段：打开后会参考最新网页信息，速度会慢一些；关闭则按基础模式快速推进。",
    marker: "联网",
    target: "search-toggle",
  },
] as const;

export function getHelpOnboardingStorageKey(storageOwnerKey?: string | null) {
  return storageOwnerKey
    ? `${HELP_ONBOARDING_STORAGE_KEY}:${storageOwnerKey}`
    : HELP_ONBOARDING_STORAGE_KEY;
}

function markOnboardingDone(storageOwnerKey?: string | null) {
  try {
    window.localStorage.setItem(
      getHelpOnboardingStorageKey(storageOwnerKey),
      "done"
    );
  } catch {
    // Storage can be unavailable in private or locked-down browser contexts.
  }
}

function hasCompletedOnboarding(storageOwnerKey?: string | null) {
  try {
    return (
      window.localStorage.getItem(getHelpOnboardingStorageKey(storageOwnerKey)) ===
      "done"
    );
  } catch {
    return false;
  }
}

export function HelpOnboarding({
  storageOwnerKey = null,
}: {
  storageOwnerKey?: string | null;
}) {
  const titleId = useId();
  const cardRef = useRef<HTMLElement | null>(null);
  const shouldShowOnboarding = useSyncExternalStore(
    () => () => {},
    () => !hasCompletedOnboarding(storageOwnerKey),
    () => false
  );
  const [isForcedOpen, setIsForcedOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = onboardingSteps[stepIndex];
  const isLastStep = stepIndex === onboardingSteps.length - 1;

  useEffect(() => {
    const handleOpen = () => {
      setStepIndex(0);
      setIsDismissed(false);
      setIsForcedOpen(true);
    };

    window.addEventListener(HELP_ONBOARDING_OPEN_EVENT, handleOpen);

    return () => {
      window.removeEventListener(HELP_ONBOARDING_OPEN_EVENT, handleOpen);
    };
  }, []);

  useEffect(() => {
    if ((!shouldShowOnboarding && !isForcedOpen) || isDismissed) {
      return;
    }

    const target = document.querySelector<HTMLElement>(
      `[data-onboarding-target="${currentStep.target}"]`
    );

    if (!target) {
      return;
    }

    const positionCard = () => {
      const card = cardRef.current;
      if (!card) {
        return;
      }

      const gap = 28;
      const margin = 16;
      const targetRect = target.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const centeredLeft =
        targetRect.left + targetRect.width / 2 - cardRect.width / 2;
      const left = Math.min(
        Math.max(centeredLeft, margin),
        viewportWidth - cardRect.width - margin
      );
      const belowTop = targetRect.bottom + gap;
      const aboveTop = targetRect.top - cardRect.height - gap;
      const hasRoomBelow = belowTop + cardRect.height <= viewportHeight - margin;
      const hasRoomAbove = aboveTop >= margin;
      const top = hasRoomBelow
        ? belowTop
        : hasRoomAbove
          ? aboveTop
          : Math.min(
              Math.max(targetRect.bottom + gap, margin),
              viewportHeight - cardRect.height - margin
            );

      card.style.setProperty("--help-onboarding-card-left", `${left}px`);
      card.style.setProperty(
        "--help-onboarding-card-top",
        `${top}px`
      );
    };

    target.classList.add("help-onboarding-target--active");
    const targetTop = window.scrollY + target.getBoundingClientRect().top;
    window.scrollTo({
      top: Math.max(0, targetTop - 80),
      behavior: "auto",
    });

    positionCard();
    const animationFrame = window.requestAnimationFrame(positionCard);
    const settleTimer = window.setTimeout(positionCard, 80);
    window.addEventListener("resize", positionCard);
    window.addEventListener("scroll", positionCard, { passive: true });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(settleTimer);
      window.removeEventListener("resize", positionCard);
      window.removeEventListener("scroll", positionCard);
      target.classList.remove("help-onboarding-target--active");
    };
  }, [currentStep.target, isDismissed, isForcedOpen, shouldShowOnboarding]);

  const dismiss = () => {
    markOnboardingDone(storageOwnerKey);
    setIsForcedOpen(false);
    setIsDismissed(true);
  };

  const handlePrimaryAction = () => {
    if (isLastStep) {
      dismiss();
      return;
    }

    setStepIndex((current) => current + 1);
  };

  if ((!shouldShowOnboarding && !isForcedOpen) || isDismissed) {
    return null;
  }

  return (
    <div className="help-onboarding-layer pointer-events-none fixed inset-0 z-50">
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="help-onboarding-card pointer-events-auto fixed rounded-[24px] border border-[rgba(35,48,68,0.16)] bg-white p-4 text-[#233044] shadow-[0_28px_70px_rgba(27,39,53,0.2)] sm:p-5"
        ref={cardRef}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="editorial-kicker text-[11px] font-semibold text-[#5f7993]">
              {currentStep.eyebrow}
            </p>
            <h2
              className="mt-2 text-xl font-semibold tracking-[-0.03em] sm:text-2xl"
              id={titleId}
            >
              {currentStep.title}
            </h2>
          </div>
          <span className="rounded-full border border-[rgba(35,48,68,0.1)] bg-[#f3f5f7] px-3 py-1 text-sm font-semibold text-[#5f7993]">
            {stepIndex + 1} / {onboardingSteps.length}
          </span>
        </div>

        <div className="mt-4 rounded-[20px] border border-[rgba(35,48,68,0.08)] bg-[#f5f8fb] p-3">
          <div className="mb-3 flex flex-wrap gap-2">
            {onboardingSteps.map((step, index) => (
              <span
                aria-label={`${step.marker} ${
                  index === stepIndex ? "当前步骤" : "步骤"
                }`}
                className={[
                  "inline-flex h-2 rounded-full transition-all",
                  index === stepIndex
                    ? "w-12 bg-[#233044]"
                    : "w-6 bg-[#d4dee8]",
                ].join(" ")}
                key={step.marker}
              />
            ))}
          </div>
          <p className="editorial-copy text-sm leading-6 text-stone-700">
            {currentStep.body}
          </p>
          <p className="mt-3 rounded-full border border-[rgba(95,121,147,0.16)] bg-white px-3 py-2 text-xs font-medium text-[#5f7993]">
            当前高亮：{currentStep.marker}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            className="inline-flex min-h-10 items-center rounded-full border border-[rgba(35,48,68,0.12)] bg-white px-4 text-sm font-medium text-stone-500 transition hover:-translate-y-0.5 hover:text-stone-800"
            onClick={dismiss}
            type="button"
          >
            跳过
          </button>
          <button
            className="inline-flex min-h-10 items-center rounded-full border border-[#233044] bg-[#233044] px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1a2432]"
            onClick={handlePrimaryAction}
            type="button"
          >
            {isLastStep ? "开始使用" : "下一步"}
          </button>
        </div>
      </section>
    </div>
  );
}
