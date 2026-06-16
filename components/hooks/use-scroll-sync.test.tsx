import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useScrollSync } from "./use-scroll-sync";

function scrollElement({
  scrollTop,
  scrollHeight,
  clientHeight,
}: {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}) {
  const element = document.createElement("div");
  Object.defineProperties(element, {
    scrollTop: { value: scrollTop, writable: true },
    scrollHeight: { value: scrollHeight, configurable: true },
    clientHeight: { value: clientHeight, configurable: true },
  });
  return element;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("useScrollSync", () => {
  it("syncs source progress to the target", () => {
    const { result } = renderHook(() => useScrollSync(true));
    const source = scrollElement({
      scrollTop: 400,
      scrollHeight: 1000,
      clientHeight: 200,
    });
    const target = scrollElement({
      scrollTop: 0,
      scrollHeight: 2200,
      clientHeight: 200,
    });
    result.current.sourceRef.current = source;
    result.current.targetRef.current = target;

    act(() => result.current.handleSourceScroll());

    expect(target.scrollTop).toBe(1000);
  });

  it("syncs target progress back to the source", () => {
    const { result } = renderHook(() => useScrollSync(true));
    const source = scrollElement({
      scrollTop: 0,
      scrollHeight: 1000,
      clientHeight: 200,
    });
    const target = scrollElement({
      scrollTop: 500,
      scrollHeight: 1200,
      clientHeight: 200,
    });
    result.current.sourceRef.current = source;
    result.current.targetRef.current = target;

    act(() => result.current.handleTargetScroll());

    expect(source.scrollTop).toBe(400);
  });

  it("leaves the opposite side unchanged when disabled", () => {
    const { result } = renderHook(() => useScrollSync(false));
    const source = scrollElement({
      scrollTop: 400,
      scrollHeight: 1000,
      clientHeight: 200,
    });
    const target = scrollElement({
      scrollTop: 125,
      scrollHeight: 2200,
      clientHeight: 200,
    });
    result.current.sourceRef.current = source;
    result.current.targetRef.current = target;

    act(() => result.current.handleSourceScroll());

    expect(target.scrollTop).toBe(125);
  });

  it("blocks immediate feedback and releases the direction lock", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useScrollSync(true));
    const source = scrollElement({
      scrollTop: 400,
      scrollHeight: 1000,
      clientHeight: 200,
    });
    const target = scrollElement({
      scrollTop: 0,
      scrollHeight: 2200,
      clientHeight: 200,
    });
    result.current.sourceRef.current = source;
    result.current.targetRef.current = target;

    act(() => result.current.handleSourceScroll());
    target.scrollTop = 250;
    act(() => result.current.handleTargetScroll());
    expect(source.scrollTop).toBe(400);

    act(() => vi.advanceTimersByTime(51));
    act(() => result.current.handleTargetScroll());
    expect(source.scrollTop).toBe(100);
  });
});
