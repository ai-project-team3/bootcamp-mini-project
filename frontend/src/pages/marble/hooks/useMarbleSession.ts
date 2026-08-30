import { useCallback, useState } from "react";

const STORAGE_KEY = "personaMarble.session";

/** Per tab, not per browser — see the note in `mafia/hooks/usePlayerSession`. */
const storage = () => window.sessionStorage;

export interface MarbleSession {
  roomId: string;
  playerId: string;
  isHost: boolean;
}

/** The stored session, readable from outside React — the exit control needs it
 *  to tell the server which player is leaving. */
export function readMarbleSession(): MarbleSession | null {
  try {
    const raw = storage().getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MarbleSession) : null;
  } catch {
    // A corrupt or unavailable store should not block starting a fresh game.
    return null;
  }
}

/** Store a session from outside React — used when the shared room hands the
 *  whole group over to this game and each player arrives already seated. */
export function writeMarbleSession(session: MarbleSession): void {
  try {
    storage().setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Non-fatal: the session just will not survive a reload.
  }
}

/** Forget the room. Leaving this behind is what used to drop a player back
 *  into a game they had already quit. */
export function clearMarbleSession(): void {
  try {
    storage().removeItem(STORAGE_KEY);
  } catch {
    // Non-fatal.
  }
}

/** Keeps the player in their room across a reload, the way the mafia game does. */
export function useMarbleSession() {
  const [session, setSessionState] = useState<MarbleSession | null>(readMarbleSession);

  const setSession = useCallback((next: MarbleSession) => {
    setSessionState(next);
    writeMarbleSession(next);
  }, []);

  const clearSession = useCallback(() => {
    setSessionState(null);
    clearMarbleSession();
  }, []);

  return { session, setSession, clearSession };
}
