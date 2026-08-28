import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useMarbleRoom } from "./useMarbleRoom";
import * as client from "../api/client";
import type { RoomState } from "../api/types";

function roomState(overrides: Partial<RoomState> = {}): RoomState {
  return {
    room_id: "ABC123",
    phase: "WAITING",
    content_mode: "general",
    board: [],
    players: [],
    host_player_id: null,
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

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useMarbleRoom", () => {
  it("fetches the room immediately", async () => {
    vi.spyOn(client, "getRoomState").mockResolvedValue(roomState());
    const { result } = renderHook(() => useMarbleRoom("ABC123"));

    await waitFor(() => expect(result.current.state?.room_id).toBe("ABC123"));
    expect(result.current.error).toBeNull();
  });

  it("does not fetch when there is no room", () => {
    const spy = vi.spyOn(client, "getRoomState").mockResolvedValue(roomState());
    const { result } = renderHook(() => useMarbleRoom(null));

    expect(spy).not.toHaveBeenCalled();
    expect(result.current.state).toBeNull();
  });

  it("surfaces a polling failure as an error", async () => {
    vi.spyOn(client, "getRoomState").mockRejectedValue(new Error("API error 404"));
    const { result } = renderHook(() => useMarbleRoom("GONE"));

    await waitFor(() => expect(result.current.error).toContain("404"));
  });

  it("keeps polling on an interval", async () => {
    vi.useFakeTimers();
    const spy = vi.spyOn(client, "getRoomState").mockResolvedValue(roomState());
    renderHook(() => useMarbleRoom("ABC123"));

    expect(spy).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(spy).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1000);
    expect(spy).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});
