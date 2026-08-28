import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { usePlayerSession } from "./usePlayerSession";

describe("usePlayerSession", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("starts with no session when the tab has no session", () => {
    const { result } = renderHook(() => usePlayerSession());
    expect(result.current.session).toBeNull();
  });

  it("persists a session to sessionStorage and reflects it in state", () => {
    const { result } = renderHook(() => usePlayerSession());

    act(() => {
      result.current.setSession({ roomId: "r1", playerId: "p1", isHost: true });
    });

    expect(result.current.session).toEqual({ roomId: "r1", playerId: "p1", isHost: true });
    expect(JSON.parse(window.sessionStorage.getItem("mafia_game_session")!)).toEqual({
      roomId: "r1",
      playerId: "p1",
      isHost: true,
    });
  });

  it("a fresh hook instance picks up a session already in sessionStorage", () => {
    window.sessionStorage.setItem(
      "mafia_game_session",
      JSON.stringify({ roomId: "r1", playerId: "p1", isHost: false })
    );
    const { result } = renderHook(() => usePlayerSession());
    expect(result.current.session).toEqual({ roomId: "r1", playerId: "p1", isHost: false });
  });

  it("clearSession removes the stored session", () => {
    const { result } = renderHook(() => usePlayerSession());
    act(() => {
      result.current.setSession({ roomId: "r1", playerId: "p1", isHost: true });
    });
    act(() => {
      result.current.clearSession();
    });
    expect(result.current.session).toBeNull();
    expect(window.sessionStorage.getItem("mafia_game_session")).toBeNull();
  });
});
