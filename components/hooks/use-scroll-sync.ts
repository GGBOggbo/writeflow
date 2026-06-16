"use client";

import { useCallback, useEffect, useRef } from "react";
import { syncedScrollTop } from "@/lib/ui/scroll-sync";

type ScrollDirection = "source" | "target";

export function useScrollSync(enabled: boolean) {
  const sourceRef = useRef<HTMLElement | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const lockRef = useRef<ScrollDirection | null>(null);
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearReleaseTimer = useCallback(() => {
    if (!releaseTimerRef.current) return;
    clearTimeout(releaseTimerRef.current);
    releaseTimerRef.current = null;
  }, []);

  const resetSyncLock = useCallback(() => {
    clearReleaseTimer();
    lockRef.current = null;
  }, [clearReleaseTimer]);

  const sync = useCallback(
    (direction: ScrollDirection) => {
      if (!enabled) return;
      if (lockRef.current && lockRef.current !== direction) return;

      const source =
        direction === "source" ? sourceRef.current : targetRef.current;
      const target =
        direction === "source" ? targetRef.current : sourceRef.current;
      if (!source || !target) return;

      lockRef.current = direction;
      target.scrollTop = syncedScrollTop(source, target);
      clearReleaseTimer();
      releaseTimerRef.current = setTimeout(() => {
        if (lockRef.current === direction) lockRef.current = null;
        releaseTimerRef.current = null;
      }, 50);
    },
    [clearReleaseTimer, enabled]
  );

  useEffect(() => resetSyncLock, [resetSyncLock]);
  useEffect(() => {
    if (!enabled) resetSyncLock();
  }, [enabled, resetSyncLock]);

  return {
    sourceRef,
    targetRef,
    handleSourceScroll: useCallback(() => sync("source"), [sync]),
    handleTargetScroll: useCallback(() => sync("target"), [sync]),
    resetSyncLock,
  };
}
