import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WaitingRoomPage } from "./WaitingRoomPage";
import * as client from "../api/client";
import type { RoomState } from "../api/types";

const baseState: RoomState = {
  phase: "WAITING_ROOM",
  day_number: 0,
  night_number: 0,
  host_player_id: "host1",
  player_count: 4,
  personas_ready: true,
  phase_deadline: null,
  accused_player_id: null,
  night_summary: null,
  execution_result: null,
  players: [
    { player_id: "host1", nickname: "방장", is_alive: true },
    { player_id: "p2", nickname: "손님", is_alive: true },
  ],
};

describe("WaitingRoomPage", () => {
  it("lets the host start the game once the room is full", () => {
    const full: RoomState = { ...baseState, player_count: 2 };
    render(<WaitingRoomPage session={{ roomId: "r1", playerId: "host1", isHost: true }} state={full} />);
    expect(screen.getByText("게임 시작")).not.toBeDisabled();
  });

  it("disables start for the host when the room is not yet full", () => {
    render(<WaitingRoomPage session={{ roomId: "r1", playerId: "host1", isHost: true }} state={baseState} />);
    expect(screen.getByText("게임 시작")).toBeDisabled();
  });

  it("shows a waiting message and no start button for a non-host", () => {
    render(<WaitingRoomPage session={{ roomId: "r1", playerId: "p2", isHost: false }} state={baseState} />);
    expect(screen.queryByText("게임 시작")).not.toBeInTheDocument();
    expect(screen.getByText("방장이 게임을 시작하길 기다리는 중...")).toBeInTheDocument();
  });

  it("lets the host fill in remaining test players when the room isn't full", async () => {
    const spy = vi.spyOn(client, "fillTestPlayers").mockResolvedValue({ status: "ok", player_count: 4 });
    render(<WaitingRoomPage session={{ roomId: "r1", playerId: "host1", isHost: true }} state={baseState} />);

    fireEvent.click(screen.getByText("테스트용 나머지 인원 채우기 (혼자 테스트할 때)"));

    await waitFor(() => expect(spy).toHaveBeenCalledWith("r1"));
  });

  it("hides the fill-test-players button once the room is full", () => {
    const full: RoomState = { ...baseState, player_count: 2 };
    render(<WaitingRoomPage session={{ roomId: "r1", playerId: "host1", isHost: true }} state={full} />);
    expect(screen.queryByText("테스트용 나머지 인원 채우기 (혼자 테스트할 때)")).not.toBeInTheDocument();
  });

  it("lets the host fill mock persona data", async () => {
    const spy = vi.spyOn(client, "submitMockPersona").mockResolvedValue({ status: "ok" });
    render(<WaitingRoomPage session={{ roomId: "r1", playerId: "host1", isHost: true }} state={baseState} />);

    fireEvent.click(screen.getByText("무작위 성향 데이터 채우기 (테스트용)"));

    await waitFor(() => expect(spy).toHaveBeenCalledWith("r1"));
  });

  it("displays the room code so the host can share it with other players", () => {
    render(<WaitingRoomPage session={{ roomId: "room-xyz", playerId: "host1", isHost: true }} state={baseState} />);
    expect(screen.getByText("room-xyz")).toBeInTheDocument();
  });

  it("lets the host change the target player count", async () => {
    const spy = vi.spyOn(client, "updatePlayerCount").mockResolvedValue({ player_count: 6 });
    render(<WaitingRoomPage session={{ roomId: "r1", playerId: "host1", isHost: true }} state={baseState} />);

    fireEvent.click(screen.getByText("6명"));

    await waitFor(() => expect(spy).toHaveBeenCalledWith("r1", 6));
  });

  it("disables player-count options below the number of players already joined", () => {
    const twoJoined: RoomState = { ...baseState, player_count: 5 };
    render(<WaitingRoomPage session={{ roomId: "r1", playerId: "host1", isHost: true }} state={twoJoined} />);

    expect(screen.getByText("4명")).not.toBeDisabled();
    expect(screen.getByText("5명")).not.toBeDisabled();
    expect(screen.getByText("6명")).not.toBeDisabled();
  });

  it("does not show player-count controls for a non-host", () => {
    render(<WaitingRoomPage session={{ roomId: "r1", playerId: "p2", isHost: false }} state={baseState} />);
    expect(screen.queryByText("6명")).not.toBeInTheDocument();
  });

  it("shows an error message if updating player count fails", async () => {
    vi.spyOn(client, "updatePlayerCount").mockRejectedValue(new Error("이미 참가한 인원보다 적게 설정할 수 없습니다"));
    render(<WaitingRoomPage session={{ roomId: "r1", playerId: "host1", isHost: true }} state={baseState} />);

    fireEvent.click(screen.getByText("4명"));

    expect(await screen.findByRole("alert")).toHaveTextContent("이미 참가한 인원보다 적게 설정할 수 없습니다");
  });
});
