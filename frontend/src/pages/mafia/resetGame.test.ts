import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "./api/client";
import { readMafiaSession } from "./hooks/usePlayerSession";
import { hasMafiaSession, resetMafiaGame } from "./resetGame";

const SESSION = { roomId: "R1", playerId: "p1", isHost: true };

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resetMafiaGame", () => {
  it("releases the room and forgets the session", async () => {
    window.localStorage.setItem("mafia_game_session", JSON.stringify(SESSION));
    const leave = vi.spyOn(client, "leaveRoom").mockResolvedValue({ status: "room_closed" });

    await resetMafiaGame();

    expect(leave).toHaveBeenCalledWith("R1", "p1");
    expect(readMafiaSession()).toBeNull();
  });

  it("still forgets the session when the server cannot be reached", async () => {
    // Otherwise a player whose server is down is stuck in a game they quit.
    window.localStorage.setItem("mafia_game_session", JSON.stringify(SESSION));
    vi.spyOn(client, "leaveRoom").mockRejectedValue(new Error("network down"));

    await expect(resetMafiaGame()).resolves.toBeUndefined();
    expect(readMafiaSession()).toBeNull();
  });

  it("does nothing when there is no game to leave", async () => {
    const leave = vi.spyOn(client, "leaveRoom");

    await resetMafiaGame();

    expect(leave).not.toHaveBeenCalled();
  });

  it("reports whether a game is running", () => {
    expect(hasMafiaSession()).toBe(false);
    window.localStorage.setItem("mafia_game_session", JSON.stringify(SESSION));
    expect(hasMafiaSession()).toBe(true);
  });
});
