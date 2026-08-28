export type ContentMode = "general" | "adult";

export type TileType = "START" | "LOGIC" | "EMPATHY" | "DRIVE" | "CAUTION" | "CHANCE";

export type GamePhase = "WAITING" | "ROLL_DICE" | "SHOW_QUIZ" | "SUBMIT_ANSWER" | "GAME_OVER";

export type BenefitCard =
  | "EXTRA_ROLL"
  | "SCORE_DOUBLE"
  | "FORFEIT_IMMUNITY"
  | "EXTRA_HOP"
  | "SKIP_OPPONENT";

export interface Tile {
  index: number;
  type: TileType;
}

export interface RoomPlayer {
  player_id: string;
  nickname: string;
  position: number;
  score: number;
  steps_moved: number;
  active_benefit: "SCORE_DOUBLE" | "FORFEIT_IMMUNITY" | null;
  skip_next_turn: boolean;
}

/** The server withholds the correct index, so the opponent cannot read it. */
export interface RoomQuiz {
  tile_type: TileType;
  question: string;
  choices: string[];
}

export interface ChanceCard {
  kind: "benefit" | "penalty";
  benefit: BenefitCard | null;
}

export interface RoomState {
  room_id: string;
  phase: GamePhase;
  content_mode: ContentMode;
  board: Tile[];
  players: RoomPlayer[];
  host_player_id: string | null;
  current_player_id: string | null;
  last_dice_roll: number | null;
  quiz: RoomQuiz | null;
  last_answer_correct: boolean | null;
  assigned_forfeit: string | null;
  last_chance_card: ChanceCard | null;
  winner_id: string | null;
  chemistry_summary: string | null;
  board_size: number;
}

export interface JoinResult {
  player_id: string;
  is_host: boolean;
}
