import type { RoomPlayer } from "../api/types";
import { seatArt } from "./seatArt";


interface ScoreDashboardProps {
  players: RoomPlayer[];
  currentPlayerId: string | null;
  myPlayerId: string;
  /** Tiles in a full lap — the finish line for the progress bar. */
  boardSize: number;
}

const BENEFIT_LABELS: Record<"SCORE_DOUBLE" | "FORFEIT_IMMUNITY", string> = {
  SCORE_DOUBLE: "🎯 점수 2배권 보유",
  FORFEIT_IMMUNITY: "🛡️ 벌칙 면제권 보유",
};

/** Player HUD. Lap progress replaced the hearts once the race became the win condition. */
export function ScoreDashboard({ players, currentPlayerId, myPlayerId, boardSize }: ScoreDashboardProps) {
  return (
    <div className="pm-dashboard">
      {players.map((player, seat) => {
        const pct = Math.min(100, Math.round((player.steps_moved / boardSize) * 100));
        return (
          <div
            key={player.player_id}
            className={`pm-player-card ${player.player_id === currentPlayerId ? "pm-player-card--active" : ""}`}
            data-testid={`pm-player-card-${seat}`}
          >
            <img className="pm-player-card__token" src={seatArt(seat)} alt="" aria-hidden="true" />
            <div className="pm-player-card__body">
              <span className="pm-player-card__name">
                {player.nickname}
                {player.player_id === myPlayerId && <em className="pm-waiting__you">나</em>}
              </span>
              <span className="pm-player-card__score">{player.score}점</span>
              <span className="pm-progress" aria-label={`진행 ${player.steps_moved} / ${boardSize}`}>
                <span className={`pm-progress__fill pm-progress__fill--${seat}`} style={{ width: `${pct}%` }} />
              </span>
              <span className="pm-player-card__laps">
                {player.steps_moved} / {boardSize}칸
              </span>
              {player.active_benefit && (
                <span className="pm-badge">{BENEFIT_LABELS[player.active_benefit]}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
