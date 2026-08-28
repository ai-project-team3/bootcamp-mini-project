import { leaveRoom } from "./api/client";
import { clearMafiaSession, readMafiaSession } from "./hooks/usePlayerSession";

/**
 * Everything '게임 선택으로 돌아가기' has to undo for the mafia game.
 *
 * The room is released on the server — closing it outright if this player is
 * the host — and the stored session is dropped, so coming back to 마피아 starts
 * on an empty room-creation screen and the others have to be invited again.
 * The React state goes with the unmount when the page navigates away.
 *
 * A server that cannot be reached must not trap the player in the game, so a
 * failed leave still clears the session.
 */
export async function resetMafiaGame(): Promise<void> {
  const session = readMafiaSession();
  clearMafiaSession();
  if (!session) return;
  try {
    await leaveRoom(session.roomId, session.playerId);
  } catch {
    // The room may already be gone, or the server unreachable. Either way the
    // player is out of it locally, which is what the button promised.
  }
}

/** Whether there is a game to tear down — used to decide if leaving needs a
 *  confirmation, since there is nothing to lose on the entry screen. */
export function hasMafiaSession(): boolean {
  return readMafiaSession() !== null;
}
