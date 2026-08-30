import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCountdown } from "./useCountdown";

describe("useCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1000 * 1000));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the whole seconds remaining until the deadline", () => {
    const { result } = renderHook(() => useCountdown(1010));
    expect(result.current).toBe(10);
  });

  it("counts down as time passes", () => {
    const { result } = renderHook(() => useCountdown(1010));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current).toBe(7);
  });

  it("clamps to zero once the deadline has passed", () => {
    const { result } = renderHook(() => useCountdown(1010));
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(result.current).toBe(0);
  });

  it("returns 0 when there is no deadline", () => {
    const { result } = renderHook(() => useCountdown(null));
    expect(result.current).toBe(0);
  });
});
