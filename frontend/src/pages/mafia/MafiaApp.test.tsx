import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MafiaApp } from "./MafiaApp";
import * as sessionHook from "./hooks/usePlayerSession";
import * as stateHook from "./hooks/useRoomState";
import * as client from "./api/client";

describe("App phase routing", () => {
  it("renders HomePage when there is no session", () => {
    vi.spyOn(sessionHook, "usePlayerSession").mockReturnValue({
      session: null,
      setSession: vi.fn(),
      clearSession: vi.fn(),
    });

    render(<MafiaApp />);
    expect(screen.getByText("마피아 게임")).toBeInTheDocument();
  });

  it("renders WaitingRoomPage when phase is WAITING_ROOM", () => {
    vi.spyOn(sessionHook, "usePlayerSession").mockReturnValue({
      session: { roomId: "r1", playerId: "p1", isHost: true },
      setSession: vi.fn(),
      clearSession: vi.fn(),
    });
    vi.spyOn(stateHook, "useRoomState").mockReturnValue({
      state: {
        phase: "WAITING_ROOM",
        day_number: 0,
        night_number: 0,
        host_player_id: "p1",
        player_count: 4,
        personas_ready: true,
        phase_deadline: null,
        accused_player_id: null,
        night_summary: null,
        execution_result: null,
        players: [{ player_id: "p1", nickname: "정글짐", is_alive: true }],
      },
      error: null,
    });

    render(<MafiaApp />);
    expect(screen.getByText("대기실")).toBeInTheDocument();
  });

  it("renders ResultPage and fetches the result when phase is RESULT", async () => {
    vi.spyOn(sessionHook, "usePlayerSession").mockReturnValue({
      session: { roomId: "r1", playerId: "p1", isHost: true },
      setSession: vi.fn(),
      clearSession: vi.fn(),
    });
    vi.spyOn(stateHook, "useRoomState").mockReturnValue({
      state: {
        phase: "RESULT",
        day_number: 2,
        night_number: 1,
        host_player_id: "p1",
        player_count: 4,
        personas_ready: true,
        phase_deadline: null,
        accused_player_id: null,
        night_summary: null,
        execution_result: null,
        players: [],
      },
      error: null,
    });
    vi.spyOn(client, "getResult").mockResolvedValue({ winner: "citizen", players: [] });

    render(<MafiaApp />);
    expect(screen.getByText("결과를 불러오는 중...")).toBeInTheDocument();

    // Flush the pending getResult().then(setResult) update inside act()
    // so React doesn't warn about a state update outside a test wrapper.
    await waitFor(() => expect(client.getResult).toHaveBeenCalledWith("r1"));
  });

  it("clears a session pointing at a room that no longer exists and returns to HomePage", async () => {
    const clearSession = vi.fn();
    vi.spyOn(sessionHook, "usePlayerSession").mockReturnValue({
      session: { roomId: "stale-room", playerId: "p1", isHost: true },
      setSession: vi.fn(),
      clearSession,
    });
    vi.spyOn(stateHook, "useRoomState").mockReturnValue({
      state: null,
      error: "API error 404: Room not found",
    });

    render(<MafiaApp />);

    await waitFor(() => expect(clearSession).toHaveBeenCalled());
  });

  it("renders FinalDefensePage when phase is FINAL_DEFENSE", async () => {
    vi.spyOn(sessionHook, "usePlayerSession").mockReturnValue({
      session: { roomId: "r1", playerId: "p1", isHost: true },
      setSession: vi.fn(),
      clearSession: vi.fn(),
    });
    vi.spyOn(stateHook, "useRoomState").mockReturnValue({
      state: {
        phase: "FINAL_DEFENSE",
        day_number: 1,
        night_number: 0,
        host_player_id: "p1",
        player_count: 4,
        personas_ready: true,
        phase_deadline: null,
        accused_player_id: "p1",
        night_summary: null,
        execution_result: null,
        players: [{ player_id: "p1", nickname: "정글짐", is_alive: true }],
      },
      error: null,
    });
    vi.spyOn(client, "getMyView").mockResolvedValue({
      player_id: "p1",
      nickname: "정글짐",
      is_alive: true,
      role: "citizen",
      assigned_score: 50,
      assigned_by: "preference",
      investigation_result: null,
    });

    render(<MafiaApp />);
    expect(screen.getByText("정글짐님의 최후 변론 시간입니다")).toBeInTheDocument();

    await waitFor(() => expect(client.getMyView).toHaveBeenCalled());
  });

  it("renders ExecutionVotePage when phase is EXECUTION_VOTE", async () => {
    vi.spyOn(sessionHook, "usePlayerSession").mockReturnValue({
      session: { roomId: "r1", playerId: "p2", isHost: false },
      setSession: vi.fn(),
      clearSession: vi.fn(),
    });
    vi.spyOn(stateHook, "useRoomState").mockReturnValue({
      state: {
        phase: "EXECUTION_VOTE",
        day_number: 1,
        night_number: 0,
        host_player_id: "p1",
        player_count: 4,
        personas_ready: true,
        phase_deadline: null,
        accused_player_id: "p1",
        night_summary: null,
        execution_result: null,
        players: [
          { player_id: "p1", nickname: "정글짐", is_alive: true },
          { player_id: "p2", nickname: "라이트", is_alive: true },
        ],
      },
      error: null,
    });
    vi.spyOn(client, "getMyView").mockResolvedValue({
      player_id: "p2",
      nickname: "라이트",
      is_alive: true,
      role: "citizen",
      assigned_score: 50,
      assigned_by: "preference",
      investigation_result: null,
    });

    render(<MafiaApp />);
    expect(screen.getByText("정글짐님을 처형할까요?")).toBeInTheDocument();

    await waitFor(() => expect(client.getMyView).toHaveBeenCalled());
  });
});
