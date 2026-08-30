/**
 * Room sizes the backend's role table supports.
 * Mirrors `backend/app/mafia/roles/capacity.py`. Adding a size means editing
 * that table first — the API rejects anything not in it.
 */
export const PLAYER_COUNT_OPTIONS = [4, 5, 6, 7, 8] as const;
