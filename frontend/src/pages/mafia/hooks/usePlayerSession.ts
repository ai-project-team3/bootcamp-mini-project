import { useCallback, useState } from "react";

export interface PlayerSession {
  roomId: string;
  playerId: string;
  isHost: boolean;
}

const STORAGE_KEY = "mafia_game_session";

/** The stored session, readable from outside React — the exit control needs it
 *  to tell the server which player is leaving. */
export function readMafiaSession(): PlayerSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PlayerSession) : null;
  } catch {
    return null;
  }
}

export function writeMafiaSession(session: PlayerSession): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Non-fatal: the session just will not survive a reload.
  }
}

/** Forget the room. Leaving this behind is what used to drop a player back
 *  into a game they had already quit. */
export function clearMafiaSession(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
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
