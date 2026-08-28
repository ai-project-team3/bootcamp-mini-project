import type { RoomPlayer, RoomState, Tile } from "../api/types";

export function makePlayer(overrides: Partial<RoomPlayer> = {}): RoomPlayer {
  return {
    player_id: "p1",
    nickname: "민수",
    position: 0,
    score: 0,
    steps_moved: 0,
    active_benefit: null,
    skip_next_turn: false,
    ...overrides,
  };
}

export function makeBoard(): Tile[] {
  const types: Tile["type"][] = [
    "START", "LOGIC", "EMPATHY", "DRIVE", "CAUTION", "CHANCE",
    "LOGIC", "EMPATHY", "DRIVE", "CAUTION", "CHANCE", "CHANCE",
  ];
  return types.map((type, index) => ({ index, type }));
}

export function makeRoomState(overrides: Partial<RoomState> = {}): RoomState {
  const players = overrides.players ?? [
    makePlayer({ player_id: "p1", nickname: "민수" }),
    makePlayer({ player_id: "p2", nickname: "지은" }),
  ];
  return {
    room_id: "ABC123",
    phase: "ROLL_DICE",
    content_mode: "general",
    board: makeBoard(),
    host_player_id: players[0]?.player_id ?? null,
    current_player_id: players[0]?.player_id ?? null,
    last_dice_roll: null,
    quiz: null,
    last_answer_correct: null,
    assigned_forfeit: null,
    last_chance_card: null,
    winner_id: null,
    chemistry_summary: null,
    board_size: 12,
    max_players: 2,
    quiz_subject_id: null,
    forfeit_target_id: null,
    skipped_player_id: null,
    ...overrides,
    players,
  };
}
