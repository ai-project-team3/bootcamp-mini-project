import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "./api/client";
import { readMarbleSession } from "./hooks/useMarbleSession";
import { hasMarbleSession, resetMarbleGame } from "./resetGame";

const SESSION = { roomId: "R1", playerId: "p1", isHost: true };

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resetMarbleGame", () => {
  it("releases the room and forgets the session", async () => {
    window.sessionStorage.setItem("personaMarble.session", JSON.stringify(SESSION));
    const leave = vi.spyOn(client, "leaveRoom").mockResolvedValue({ status: "room_closed" });

    await resetMarbleGame();

    expect(leave).toHaveBeenCalledWith("R1", "p1");
    expect(readMarbleSession()).toBeNull();
  });

  it("still forgets the session when the server cannot be reached", async () => {
    // Otherwise a player whose server is down is stuck in a game they quit.
    window.sessionStorage.setItem("personaMarble.session", JSON.stringify(SESSION));
    vi.spyOn(client, "leaveRoom").mockRejectedValue(new Error("network down"));

    await expect(resetMarbleGame()).resolves.toBeUndefined();
    expect(readMarbleSession()).toBeNull();
  });

  it("does nothing when there is no game to leave", async () => {
    const leave = vi.spyOn(client, "leaveRoom");

    await resetMarbleGame();

    expect(leave).not.toHaveBeenCalled();
  });

  it("reports whether a game is running", () => {
    expect(hasMarbleSession()).toBe(false);
    window.sessionStorage.setItem("personaMarble.session", JSON.stringify(SESSION));
    expect(hasMarbleSession()).toBe(true);
  });
});
