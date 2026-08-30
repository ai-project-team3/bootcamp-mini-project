import { act, render, screen } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { ForfeitSlot } from "./ForfeitSlot";

/**
 * Step the reel by hand.
 *
 * vitest's fake timers already stand in for requestAnimationFrame, so the only
 * thing left to control is the clock the component reads — it drives the spin
 * off `performance.now()`, not off the frame count.
 */
function installRafClock() {
  let now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  return {
    advance(ms: number) {
      const steps = Math.ceil(ms / 16);
      for (let i = 0; i < steps; i += 1) {
        now += 16;
        act(() => {
          vi.advanceTimersByTime(16);
        });
      }
    },
  };
}

describe("ForfeitSlot", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("keeps the winner hidden while the reel is still spinning", () => {
    const clock = installRafClock();
    render(<ForfeitSlot names={["민준", "서연", "도윤"]} winnerIndex={2} />);

    clock.advance(500);
    expect(screen.getByRole("status")).toHaveTextContent("벌칙 받을 사람 뽑는 중");
  });

  it("announces the drawn name once the reel settles", () => {
    const clock = installRafClock();
    render(<ForfeitSlot names={["민준", "서연", "도윤"]} winnerIndex={1} />);

    clock.advance(4000);
    expect(screen.getByRole("status")).toHaveTextContent("서연님 당첨!");
  });

  it("reports settling exactly once", () => {
    const clock = installRafClock();
    const onSettled = vi.fn();
    render(<ForfeitSlot names={["민준", "서연"]} winnerIndex={0} onSettled={onSettled} />);

    clock.advance(4200);
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it("teases past the winner near the end, then comes back to it", () => {
    const clock = installRafClock();
    const { container } = render(
      <ForfeitSlot names={["민준", "서연", "도윤"]} winnerIndex={1} />,
    );
    const strip = () => container.querySelector(".pm-slot-strip") as HTMLElement;
    const offsetOf = (el: HTMLElement) =>
      Number(/translateY\((-?[\d.]+)px\)/.exec(el.style.transform)?.[1] ?? 0);

    // Just into the tease window, the reel has crept past the resting spot...
    clock.advance(3100);
    const teased = offsetOf(strip());

    // ...and by the end it has come back and stopped there.
    clock.advance(1000);
    const final = offsetOf(strip());

    expect(teased).toBeLessThan(final);
    expect(screen.getByRole("status")).toHaveTextContent("서연님 당첨!");
  });

  it("renders nothing when there is nobody to draw from", () => {
    const { container } = render(<ForfeitSlot names={[]} winnerIndex={0} />);
    expect(container.querySelector(".pm-slot")).toBeNull();
  });
});
