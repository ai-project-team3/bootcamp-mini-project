import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreDashboard } from "./ScoreDashboard";
import { makePlayer } from "../test/fixtures";

const players = (stepsA = 0, stepsB = 0, scoreA = 0, scoreB = 0) => [
  makePlayer({ player_id: "p1", nickname: "민수", steps_moved: stepsA, score: scoreA }),
  makePlayer({ player_id: "p2", nickname: "지은", steps_moved: stepsB, score: scoreB }),
];

describe("ScoreDashboard", () => {
  it("shows both players' nicknames and scores", () => {
    render(
      <ScoreDashboard players={players(0, 0, 20, 30)} currentPlayerId="p1" myPlayerId="p1" boardSize={12} />
    );
    expect(screen.getByText("20점")).toBeInTheDocument();
    expect(screen.getByText("30점")).toBeInTheDocument();
    expect(screen.getByText(/민수/)).toBeInTheDocument();
    expect(screen.getByText(/지은/)).toBeInTheDocument();
  });

  it("highlights whoever is on turn", () => {
    render(<ScoreDashboard players={players()} currentPlayerId="p2" myPlayerId="p1" boardSize={12} />);
    expect(screen.getByTestId("pm-player-card-1").className).toContain("pm-player-card--active");
    expect(screen.getByTestId("pm-player-card-0").className).not.toContain("pm-player-card--active");
  });

  it("marks which card is you", () => {
    render(<ScoreDashboard players={players()} currentPlayerId="p1" myPlayerId="p2" boardSize={12} />);
    expect(screen.getByTestId("pm-player-card-1")).toHaveTextContent("나");
    expect(screen.getByTestId("pm-player-card-0")).not.toHaveTextContent("나");
  });

  it("shows lap progress out of the board size", () => {
    render(<ScoreDashboard players={players(5, 2)} currentPlayerId="p1" myPlayerId="p1" boardSize={12} />);
    expect(screen.getByTestId("pm-player-card-0")).toHaveTextContent("5 / 12칸");
    expect(screen.getByTestId("pm-player-card-1")).toHaveTextContent("2 / 12칸");
  });

  it("caps the progress bar at 100% once the lap is complete", () => {
    const { container } = render(
      <ScoreDashboard players={players(14, 0)} currentPlayerId="p1" myPlayerId="p1" boardSize={12} />
    );
    const fill = container.querySelector(".pm-progress__fill") as HTMLElement;
    expect(fill.style.width).toBe("100%");
  });

  it("shows a badge when a player holds a benefit", () => {
    const withBenefit = players();
    withBenefit[0].active_benefit = "SCORE_DOUBLE";
    render(<ScoreDashboard players={withBenefit} currentPlayerId="p1" myPlayerId="p1" boardSize={12} />);
    expect(screen.getByText(/점수 2배권 보유/)).toBeInTheDocument();
  });
});
