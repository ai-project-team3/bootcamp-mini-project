import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRoomState } from "./useRoomState";
import * as client from "../api/client";

const sampleState = {
  phase: "WAITING_ROOM" as const,
  day_number: 0,
  night_number: 0,
  host_player_id: null,
  player_count: 4,
  personas_ready: false,
  phase_deadline: null,
  accused_player_id: null,
  night_summary: null,
  execution_result: null,
  players: [],
};

describe("useRoomState", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("fetches immediately and stores the result", async () => {
    vi.spyOn(client, "getRoomState").mockResolvedValue(sampleState);

    const { result } = renderHook(() => useRoomState("room1"));

    await waitFor(() => expect(result.current.state?.phase).toBe("WAITING_ROOM"));
  });

  it("polls again after the interval elapses", async () => {
    const spy = vi.spyOn(client, "getRoomState").mockResolvedValue(sampleState);

    renderHook(() => useRoomState("room1"));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("does nothing when roomId is null", () => {
    const spy = vi.spyOn(client, "getRoomState");
    renderHook(() => useRoomState(null));
    expect(spy).not.toHaveBeenCalled();
  });

  it("surfaces fetch errors without throwing", async () => {
    vi.spyOn(client, "getRoomState").mockRejectedValue(new Error("API error 404: Room not found"));

    const { result } = renderHook(() => useRoomState("missing-room"));

    await waitFor(() => expect(result.current.error).toMatch(/404/));
  });
});
