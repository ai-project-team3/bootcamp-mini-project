/**
 * Seats a marble room can have.
 * Mirrors MIN_PLAYERS / MAX_PLAYERS in `backend/app/marble/models/room.py`.
 */
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const PLAYER_COUNT_OPTIONS = [2, 3, 4, 5, 6, 7, 8] as const;
