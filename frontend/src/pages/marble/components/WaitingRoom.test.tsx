import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WaitingRoom } from "./WaitingRoom";
import type { RoomPlayer, RoomState } from "../api/types";

function player(id: string, nickname: string): RoomPlayer {
  return {
    player_id: id,
    nickname,
    position: 0,
    score: 0,
    steps_moved: 0,
    active_benefit: null,
    skip_next_turn: false,
  };
}

function roomState(players: RoomPlayer[], overrides: Partial<RoomState> = {}): RoomState {
  return {
    room_id: "ABC123",
    phase: "WAITING",
    content_mode: "general",
    board: [],
    players,
    host_player_id: players[0]?.player_id ?? null,
    current_player_id: null,
    last_dice_roll: null,
    quiz: null,
    last_answer_correct: null,
    assigned_forfeit: null,
    last_chance_card: null,
    winner_id: null,
    chemistry_summary: null,
    board_size: 12,
    ...overrides,
  };
}

const noop = () => {};

describe("WaitingRoom", () => {
  it("shows the room code", () => {
    render(
      <WaitingRoom state={roomState([player("p1", "민수")])} playerId="p1" onStart={noop} onLeave={noop} />
    );
    expect(screen.getByText("ABC123")).toBeInTheDocument();
  });

  it("shows an empty seat while waiting for the opponent", () => {
    render(
      <WaitingRoom state={roomState([player("p1", "민수")])} playerId="p1" onStart={noop} onLeave={noop} />
    );
    expect(screen.getByTestId("pm-seat-0")).toHaveTextContent("민수");
    expect(screen.getByTestId("pm-seat-1")).toHaveTextContent("상대를 기다리는 중");
  });

  it("marks which seat is you", () => {
    const players = [player("p1", "민수"), player("p2", "지은")];
    render(<WaitingRoom state={roomState(players)} playerId="p2" onStart={noop} onLeave={noop} />);
    expect(screen.getByTestId("pm-seat-1")).toHaveTextContent("나");
    expect(screen.getByTestId("pm-seat-0")).not.toHaveTextContent("나");
  });

  it("keeps the host's start button disabled until the room is full", () => {
    render(
      <WaitingRoom state={roomState([player("p1", "민수")])} playerId="p1" onStart={noop} onLeave={noop} />
    );
    expect(screen.getByRole("button", { name: /상대를 기다리는 중/ })).toBeDisabled();
  });

  it("lets the host start once both players are in", () => {
    const onStart = vi.fn();
    const players = [player("p1", "민수"), player("p2", "지은")];
    render(<WaitingRoom state={roomState(players)} playerId="p1" onStart={onStart} onLeave={noop} />);

    const button = screen.getByRole("button", { name: "게임 시작" });
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("shows a waiting hint to the non-host instead of a start button", () => {
    const players = [player("p1", "민수"), player("p2", "지은")];
    render(<WaitingRoom state={roomState(players)} playerId="p2" onStart={noop} onLeave={noop} />);

    expect(screen.queryByRole("button", { name: "게임 시작" })).not.toBeInTheDocument();
    expect(screen.getByText(/방장이 시작하기를 기다리는 중/)).toBeInTheDocument();
  });

  it("copies an invite link carrying the room code", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    render(
      <WaitingRoom state={roomState([player("p1", "민수")])} playerId="p1" onStart={noop} onLeave={noop} />
    );
    fireEvent.click(screen.getByText("초대 링크 복사"));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("?room=ABC123"));
    vi.unstubAllGlobals();
  });

  it("shows the selected content mode", () => {
    render(
      <WaitingRoom
        state={roomState([player("p1", "민수")], { content_mode: "adult" })}
        playerId="p1"
        onStart={noop}
        onLeave={noop}
      />
    );
    expect(screen.getByText("19금 모드")).toBeInTheDocument();
  });
});
