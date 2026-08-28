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

export interface PersonaScores {
  initiative: number;
  analysis: number;
  empathy: number;
  caution: number;
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
