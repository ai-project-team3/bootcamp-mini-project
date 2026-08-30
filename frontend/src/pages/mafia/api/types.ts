export type GamePhase =
  | "WAITING_ROOM"
  | "ROLE_ASSIGNMENT"
  | "DAY_DISCUSSION"
  | "DAY_VOTE"
  | "FINAL_DEFENSE"
  | "EXECUTION_VOTE"
  | "NIGHT_ACTION"
  | "RESULT";

export type Role = "mafia" | "police" | "doctor" | "citizen";
export type AssignedBy = "preference" | "fallback_random";
export type ExecutionVerdict = "guilty" | "innocent";

export interface RoomPlayerSummary {
  player_id: string;
  nickname: string;
  is_alive: boolean;
}

export interface NightSummary {
  attacked_nickname: string | null;
  died: boolean;
}

export interface ExecutionResult {
  nickname: string;
  executed: boolean;
}

export interface RoomState {
  phase: GamePhase;
  day_number: number;
  night_number: number;
  host_player_id: string | null;
  player_count: number;
  personas_ready: boolean;
  phase_deadline: number | null;
  accused_player_id: string | null;
  night_summary: NightSummary | null;
  execution_result: ExecutionResult | null;
  players: RoomPlayerSummary[];
}

export interface InvestigationResult {
  police_id: string;
  target_id: string;
  is_mafia: boolean;
}

export interface MyView {
  player_id: string;
  nickname: string;
  is_alive: boolean;
  role: Role | null;
  assigned_score: number | null;
  assigned_by: AssignedBy | null;
  investigation_result: InvestigationResult | null;
}

/**
 * The five abilities the icebreaking run measures, under its own names.
 *
 * This game takes that vocabulary rather than translating in both directions —
 * the run computes them, so it owns the schema (docs/페르소나-인계.md).
 */
export interface PersonaScores {
  /** 주도력 — 판을 먼저 벌리나 */
  DOM: number;
  /** 순발력 — 얼마나 빨리 결정하나 */
  SPD: number;
  /** 표현력 — 자기를 얼마나 드러내나 */
  EXP: number;
  /** 공감력 — 남을 얼마나 살피나 */
  EMP: number;
  /** 관찰력 — 남을 얼마나 맞히나 */
  OBS: number;
}

export interface ResultPlayer {
  player_id: string;
  nickname: string;
  role: Role;
  is_alive: boolean;
  assigned_score: number;
  assigned_by: AssignedBy;
  persona_scores: PersonaScores;
}

export interface GameResult {
  winner: "mafia" | "citizen";
  players: ResultPlayer[];
}
