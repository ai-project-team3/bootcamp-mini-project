import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Dice } from "./Dice";

/** How many pips the rendered face is actually showing. */
function litPips() {
  return document.querySelectorAll(".pm-dice__pip--on").length;
}

describe("Dice", () => {
  it.each([1, 2, 3])("shows %i pips on the face matching the badge value", (value) => {
    render(<Dice lastRoll={value} disabled={false} onRoll={() => {}} />);
    expect(litPips()).toBe(value);
    expect(screen.getByTestId("pm-dice-badge")).toHaveTextContent(String(value));
  });

  it("renders no pips and no badge before the first roll", () => {
    render(<Dice lastRoll={null} disabled={false} onRoll={() => {}} />);
    expect(litPips()).toBe(0);
    expect(screen.queryByTestId("pm-dice-badge")).not.toBeInTheDocument();
  });

  it("keeps the badge outside the tumbling die so it does not rotate with it", () => {
    render(<Dice lastRoll={2} disabled={false} onRoll={() => {}} />);
    const die = screen.getByTestId("pm-dice");
    const badge = screen.getByTestId("pm-dice-badge");
    expect(die.contains(badge)).toBe(false);
  });

  it("disables the button and calls onRoll once the throw finishes", async () => {
    vi.useFakeTimers();
    const onRoll = vi.fn();
    render(<Dice lastRoll={null} disabled={false} onRoll={onRoll} />);

    const button = screen.getByRole("button");
    act(() => {
      fireEvent.click(button);
    });
    expect(button).toBeDisabled();
    expect(onRoll).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onRoll).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("renders the caption and eyebrow when given", () => {
    render(<Dice lastRoll={null} disabled onRoll={() => {}} eyebrow="턴 3 / 10" caption="민수님 차례" />);
    expect(screen.getByText("턴 3 / 10")).toBeInTheDocument();
    expect(screen.getByText("민수님 차례")).toBeInTheDocument();
  });
});
