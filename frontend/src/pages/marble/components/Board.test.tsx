import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Board } from "./Board";
import { makeBoard, makePlayer } from "../test/fixtures";

const players = () => [
  makePlayer({ player_id: "p1", nickname: "민수", position: 0 }),
  makePlayer({ player_id: "p2", nickname: "지은", position: 3 }),
];

/** Tokens render as images labelled with the player's nickname. */
function tokenOn(tileIndex: number, nickname: string) {
  return within(screen.getByTestId(`pm-tile-${tileIndex}`)).queryByAltText(nickname);
}

describe("Board", () => {
  it("renders all 12 tiles", () => {
    render(<Board board={makeBoard()} players={players()} />);
    for (let i = 0; i < 12; i++) {
      expect(screen.getByTestId(`pm-tile-${i}`)).toBeInTheDocument();
    }
  });

  it("renders each player's token on the tile they occupy", () => {
    render(<Board board={makeBoard()} players={players()} />);
    expect(tokenOn(0, "민수")).toBeInTheDocument();
    expect(tokenOn(3, "지은")).toBeInTheDocument();
  });

  it("uses animatedPositions instead of the committed position when provided", () => {
    render(<Board board={makeBoard()} players={players()} animatedPositions={{ p1: 5 }} />);
    expect(tokenOn(0, "민수")).not.toBeInTheDocument();
    expect(tokenOn(5, "민수")).toBeInTheDocument();
    expect(tokenOn(3, "지은")).toBeInTheDocument();
  });

  it("renders hub content in the board's center", () => {
    render(
      <Board board={makeBoard()} players={players()}>
        <p>주사위 자리</p>
      </Board>
    );
    expect(screen.getByText("주사위 자리")).toBeInTheDocument();
  });
});
