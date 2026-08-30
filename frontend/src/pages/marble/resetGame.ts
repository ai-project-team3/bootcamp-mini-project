import { leaveRoom } from "./api/client";
import { clearMarbleSession, readMarbleSession } from "./hooks/useMarbleSession";

/**
 * Everything '게임 선택으로 돌아가기' has to undo for 커플 브루마블.
 *
 * The room is released on the server — closing it outright if this player is
 * the host — and the stored session is dropped, so coming back to the game
 * starts on an empty room-creation screen and the others have to be invited
 * again. The React state goes with the unmount when the page navigates away.
 */
export async function resetMarbleGame(): Promise<void> {
  const session = readMarbleSession();
  clearMarbleSession();
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
export function hasMarbleSession(): boolean {
  return readMarbleSession() !== null;
}
