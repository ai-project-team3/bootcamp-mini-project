import { afterEach, describe, expect, it, vi } from "vitest";
import {
  advancePhase,
  createRoom,
  getRoomState,
  restartRoom,
  submitExecutionVote,
  submitNightAction,
  updatePlayerCount,
} from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api client", () => {
  it("createRoom posts player_count and returns room_id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ room_id: "abc" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await createRoom(4);

    expect(result).toEqual({ room_id: "abc" });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/mafia/rooms");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body as string)).toEqual({ player_count: 4 });
  });

  it("throws a descriptive error when the response is not ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "player_count must be 4, 5, or 6",
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getRoomState("room1")).rejects.toThrow(/400/);
  });

  it("getRoomState issues a GET to the room's state endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        phase: "WAITING_ROOM",
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
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await getRoomState("room1");

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/mafia/rooms/room1/state");
    expect(options?.method ?? "GET").toBe("GET");
  });

  it("submitExecutionVote posts voter_id and verdict", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitExecutionVote("room1", "p1", "guilty");

    expect(result).toEqual({ status: "ok" });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/mafia/rooms/room1/execution-vote");
    expect(JSON.parse(options.body as string)).toEqual({ voter_id: "p1", verdict: "guilty" });
  });

  it("restartRoom posts to the restart endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ phase: "WAITING_ROOM" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await restartRoom("room1");

    expect(result).toEqual({ phase: "WAITING_ROOM" });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/mafia/rooms/room1/restart");
    expect(options.method).toBe("POST");
  });

  it("advancePhase posts to the advance endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ phase: "DAY_DISCUSSION" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await advancePhase("room1");

    expect(result).toEqual({ phase: "DAY_DISCUSSION" });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/mafia/rooms/room1/advance");
    expect(options.method).toBe("POST");
  });

  it("updatePlayerCount posts to the player-count endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ player_count: 6 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await updatePlayerCount("room1", 6);

    expect(result).toEqual({ player_count: 6 });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/mafia/rooms/room1/player-count");
    expect(JSON.parse(options.body as string)).toEqual({ player_count: 6 });
  });

  it("submitNightAction returns investigation_result when the backend includes it", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "ok",
        investigation_result: { police_id: "p1", target_id: "p2", is_mafia: true },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitNightAction("room1", "p1", "investigate", "p2");

    expect(result.investigation_result).toEqual({ police_id: "p1", target_id: "p2", is_mafia: true });
  });
});
