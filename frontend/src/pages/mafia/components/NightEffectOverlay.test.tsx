import { act, render } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { NightEffectOverlay } from "./NightEffectOverlay";

describe("NightEffectOverlay", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the given image with the kind-specific overlay class", () => {
    const { container } = render(
      <NightEffectOverlay kind="knife" imageSrc="knife.png" onDone={() => {}} />
    );
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "knife.png");
    expect(img?.parentElement).toHaveClass("night-effect-overlay", "night-effect-overlay--knife");
  });

  it("calls onDone once the effect's duration elapses", () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<NightEffectOverlay kind="knife" imageSrc="knife.png" onDone={onDone} />);

    expect(onDone).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(699);
    });
    expect(onDone).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("uses a longer duration for the angel effect", () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<NightEffectOverlay kind="angel" imageSrc="angel.png" onDone={onDone} />);

    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(onDone).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
