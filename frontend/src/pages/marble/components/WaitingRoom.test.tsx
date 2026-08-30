import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
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
    max_players: 2,
    quiz_subject_id: null,
    forfeit_target_id: null,
    skipped_player_id: null,
    ...overrides,
  };
}

const noop = () => {};

describe("WaitingRoom", () => {
  it("shows the room code", () => {
    render(
      <WaitingRoom state={roomState([player("p1", "민수")])} playerId="p1" onStart={noop} onLeave={noop} onChangeMaxPlayers={noop} />
    );
    expect(screen.getByText("ABC123")).toBeInTheDocument();
  });

  it("shows an empty seat while waiting for the opponent", () => {
    render(
      <WaitingRoom state={roomState([player("p1", "민수")])} playerId="p1" onStart={noop} onLeave={noop} onChangeMaxPlayers={noop} />
    );
    expect(screen.getByTestId("game-room-seat-0")).toHaveTextContent("민수");
    expect(screen.getByTestId("game-room-seat-1")).toHaveTextContent("비어 있음");
  });

  it("marks which seat is you", () => {
    const players = [player("p1", "민수"), player("p2", "지은")];
    render(<WaitingRoom state={roomState(players)} playerId="p2" onStart={noop} onLeave={noop} onChangeMaxPlayers={noop} />);
    expect(screen.getByTestId("game-room-seat-1")).toHaveTextContent("나");
    expect(screen.getByTestId("game-room-seat-0")).not.toHaveTextContent("나");
  });

  it("keeps the host's start button disabled until the room is full", () => {
    render(
      <WaitingRoom state={roomState([player("p1", "민수")])} playerId="p1" onStart={noop} onLeave={noop} onChangeMaxPlayers={noop} />
    );
    expect(screen.getByRole("button", { name: /1명을 더 기다리는 중/ })).toBeDisabled();
  });

  it("lets the host start once both players are in", () => {
    const onStart = vi.fn();
    const players = [player("p1", "민수"), player("p2", "지은")];
    render(<WaitingRoom state={roomState(players)} playerId="p1" onStart={onStart} onLeave={noop} onChangeMaxPlayers={noop} />);

    const button = screen.getByRole("button", { name: "게임 시작" });
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("shows a waiting hint to the non-host instead of a start button", () => {
    const players = [player("p1", "민수"), player("p2", "지은")];
    render(<WaitingRoom state={roomState(players)} playerId="p2" onStart={noop} onLeave={noop} onChangeMaxPlayers={noop} />);

    expect(screen.queryByRole("button", { name: "게임 시작" })).not.toBeInTheDocument();
    expect(screen.getByText(/방장이 시작하기를 기다리는 중/)).toBeInTheDocument();
  });

  it("copies an invite link carrying the room code", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    render(
      <WaitingRoom state={roomState([player("p1", "민수")])} playerId="p1" onStart={noop} onLeave={noop} onChangeMaxPlayers={noop} />
    );
    fireEvent.click(screen.getByText("초대 링크 복사"));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("?room=ABC123"));
    vi.unstubAllGlobals();
  });


  it("draws one seat per person the room was created for", () => {
    render(
      <WaitingRoom
        state={roomState([player("p1", "민수"), player("p2", "지은")], { max_players: 6 })}
        playerId="p1"
        onStart={noop}
        onLeave={noop} onChangeMaxPlayers={noop}
      />
    );

    for (let seat = 0; seat < 6; seat += 1) {
      expect(screen.getByTestId(`game-room-seat-${seat}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId("game-room-seat-6")).not.toBeInTheDocument();
  });

  it("counts who has arrived against the room size", () => {
    render(
      <WaitingRoom
        state={roomState([player("p1", "민수"), player("p2", "지은"), player("p3", "현우")], {
          max_players: 5,
        })}
        playerId="p1"
        onStart={noop}
        onLeave={noop} onChangeMaxPlayers={noop}
      />
    );

    expect(screen.getByText("3 / 5명 · 2명 더 들어오면 시작해요")).toBeInTheDocument();
  });

  it("says the room is full once every seat is taken", () => {
    const players = [player("p1", "민수"), player("p2", "지은"), player("p3", "현우")];
    render(
      <WaitingRoom
        state={roomState(players, { max_players: 3 })}
        playerId="p1"
        onStart={noop}
        onLeave={noop} onChangeMaxPlayers={noop}
      />
    );

    expect(screen.getByText("3 / 3명 · 모두 모였어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "게임 시작" })).not.toBeDisabled();
  });

  it("keeps a larger room from starting early", () => {
    render(
      <WaitingRoom
        state={roomState([player("p1", "민수"), player("p2", "지은")], { max_players: 8 })}
        playerId="p1"
        onStart={noop}
        onLeave={noop} onChangeMaxPlayers={noop}
      />
    );

    expect(screen.getByRole("button", { name: /6명을 더 기다리는 중/ })).toBeDisabled();
  });

  it("gives every seat its own token art", () => {
    const { container } = render(
      <WaitingRoom
        state={roomState([player("p1", "민수")], { max_players: 8 })}
        playerId="p1"
        onStart={noop}
        onLeave={noop} onChangeMaxPlayers={noop}
      />
    );

    const sources = Array.from(container.querySelectorAll<HTMLImageElement>(".pm-waiting__seat-token")).map(
      (img) => img.getAttribute("src"),
    );
    expect(sources).toHaveLength(8);
    expect(sources.every(Boolean)).toBe(true);
    expect(new Set(sources).size).toBe(8);
  });


  it("lets the host resize the room while people are still arriving", () => {
    const onChangeMaxPlayers = vi.fn();
    render(
      <WaitingRoom
        state={roomState([player("p1", "민수"), player("p2", "지은")], { max_players: 4 })}
        playerId="p1"
        onStart={noop}
        onLeave={noop}
        onChangeMaxPlayers={onChangeMaxPlayers}
      />
    );

    const group = screen.getByRole("group", { name: "인원 변경" });
    fireEvent.click(within(group).getByRole("button", { name: "6" }));
    expect(onChangeMaxPlayers).toHaveBeenCalledWith(6);
  });

  it("will not offer a size smaller than the people already here", () => {
    render(
      <WaitingRoom
        state={roomState([player("p1", "민수"), player("p2", "지은"), player("p3", "현우")], {
          max_players: 5,
        })}
        playerId="p1"
        onStart={noop}
        onLeave={noop}
        onChangeMaxPlayers={noop}
      />
    );

    const group = screen.getByRole("group", { name: "인원 변경" });
    expect(within(group).getByRole("button", { name: "2" })).toBeDisabled();
    expect(within(group).getByRole("button", { name: "3" })).not.toBeDisabled();
  });

  it("hides the resize control from everyone but the host", () => {
    render(
      <WaitingRoom
        state={roomState([player("p1", "민수"), player("p2", "지은")], { max_players: 4 })}
        playerId="p2"
        onStart={noop}
        onLeave={noop}
        onChangeMaxPlayers={noop}
      />
    );

    expect(screen.queryByRole("group", { name: "인원 변경" })).not.toBeInTheDocument();
  });

  it("shows the selected content mode", () => {
    render(
      <WaitingRoom
        state={roomState([player("p1", "민수")], { content_mode: "adult" })}
        playerId="p1"
        onStart={noop}
        onLeave={noop} onChangeMaxPlayers={noop}
      />
    );
    expect(screen.getByText("19금 모드")).toBeInTheDocument();
  });
});
