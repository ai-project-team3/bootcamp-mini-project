import { useCallback, useState } from "react";

export interface PlayerSession {
  roomId: string;
  playerId: string;
  isHost: boolean;
}

const STORAGE_KEY = "mafia_game_session";

function readStoredSession(): PlayerSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PlayerSession) : null;
  } catch {
    return null;
  }
}

export function usePlayerSession() {
  const [session, setSessionState] = useState<PlayerSession | null>(() => readStoredSession());

  const setSession = useCallback((next: PlayerSession) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSessionState(next);
  }, []);

  const clearSession = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setSessionState(null);
  }, []);

  return { session, setSession, clearSession };
}
