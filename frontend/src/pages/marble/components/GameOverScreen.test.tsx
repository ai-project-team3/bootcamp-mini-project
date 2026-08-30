import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { GameOverScreen } from "./GameOverScreen";
import { makePlayer } from "../test/fixtures";

const players = () => [
  makePlayer({ player_id: "p1", nickname: "민수", score: 80, steps_moved: 12 }),
  makePlayer({ player_id: "p2", nickname: "지은", score: 60, steps_moved: 9 }),
];

const noop = () => {};

describe("GameOverScreen", () => {
  it("announces the player who completed the lap", () => {
    render(
      <GameOverScreen
        players={players()}
        winnerId="p1"
        myPlayerId="p1"
        chemistrySummary="총평"
        onRestart={noop}
        onExit={noop}
      />
    );
    expect(screen.getByText("민수님 완주 승리!")).toBeInTheDocument();
  });

  it("shows each player's score and distance travelled", () => {
    render(
      <GameOverScreen
        players={players()}
        winnerId="p1"
        myPlayerId="p2"
        chemistrySummary="총평"
        onRestart={noop}
        onExit={noop}
      />
    );
    expect(screen.getByText("80점")).toBeInTheDocument();
    expect(screen.getByText("12칸 이동")).toBeInTheDocument();
    expect(screen.getByText("9칸 이동")).toBeInTheDocument();
  });

  it("renders the chemistry summary", () => {
    render(
      <GameOverScreen
        players={players()}
        winnerId="p1"
        myPlayerId="p1"
        chemistrySummary="특별한 케미 문장"
        onRestart={noop}
        onExit={noop}
      />
    );
    expect(screen.getByText("특별한 케미 문장")).toBeInTheDocument();
  });

  it("calls onRestart and onExit from their buttons", () => {
    const onRestart = vi.fn();
    const onExit = vi.fn();
    render(
      <GameOverScreen
        players={players()}
        winnerId="p1"
        myPlayerId="p1"
        chemistrySummary="총평"
        onRestart={onRestart}
        onExit={onExit}
      />
    );
    fireEvent.click(screen.getByText("다시 하기"));
    fireEvent.click(screen.getByText("나가기"));
    expect(onRestart).toHaveBeenCalledOnce();
    expect(onExit).toHaveBeenCalledOnce();
  });
});
