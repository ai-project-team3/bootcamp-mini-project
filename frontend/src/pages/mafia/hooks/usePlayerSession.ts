import { useCallback, useState } from "react";

export interface PlayerSession {
  roomId: string;
  playerId: string;
  isHost: boolean;
}

const STORAGE_KEY = "mafia_game_session";

/**
 * Why `sessionStorage` and not `localStorage`.
 *
 * A session is one player at one screen. `localStorage` is shared by every tab
 * of a browser, so two people testing from two tabs on one laptop would share a
 * single seat and both see the same hand — and when the shared room hands a
 * group over to this game, the second tab would find a session already written
 * by the first and never claim its own. `sessionStorage` is per tab, which is
 * what a player is. It still survives a reload, so refreshing mid-game keeps
 * the seat; only closing the tab gives it up, and that already loses the shared
 * room's context anyway.
 */
const storage = () => window.sessionStorage;

/** The stored session, readable from outside React — the exit control needs it
 *  to tell the server which player is leaving. */
export function readMafiaSession(): PlayerSession | null {
  try {
    const raw = storage().getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PlayerSession) : null;
  } catch {
    return null;
  }
}

export function writeMafiaSession(session: PlayerSession): void {
  try {
    storage().setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Non-fatal: the session just will not survive a reload.
  }
}

/** Forget the room. Leaving this behind is what used to drop a player back
 *  into a game they had already quit. */
export function clearMafiaSession(): void {
  try {
    storage().removeItem(STORAGE_KEY);
  } catch {
    // Non-fatal.
  }
}

export function usePlayerSession() {
  const [session, setSessionState] = useState<PlayerSession | null>(() => readMafiaSession());

  const setSession = useCallback((next: PlayerSession) => {
    writeMafiaSession(next);
    setSessionState(next);
  }, []);

  const clearSession = useCallback(() => {
    clearMafiaSession();
    setSessionState(null);
  }, []);

  return { session, setSession, clearSession };
}
