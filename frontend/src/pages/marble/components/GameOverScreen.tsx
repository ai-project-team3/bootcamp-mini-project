import type { RoomPlayer } from "../api/types";
import tokenA from "../assets/token-a.png";
import tokenB from "../assets/token-b.png";

const SEAT_ART = [tokenA, tokenB];

interface GameOverScreenProps {
  players: RoomPlayer[];
  winnerId: string | null;
  myPlayerId: string;
  chemistrySummary: string;
  onRestart: () => void;
  onExit: () => void;
}

export function GameOverScreen({
  players,
  winnerId,
  myPlayerId,
  chemistrySummary,
  onRestart,
  onExit,
}: GameOverScreenProps) {
  const winner = players.find((p) => p.player_id === winnerId);
  const iWon = winnerId === myPlayerId;

  return (
    <div className="pm-card pm-gameover">
      <span className="pm-gameover__trophy" aria-hidden="true">
        {iWon ? "🏆" : "💞"}
      </span>
      <p className="pm-eyebrow">게임 종료</p>
      <h2 className="pm-heading">
        {winner ? `${winner.nickname}님 완주 승리!` : "게임이 끝났어요"}
      </h2>

      <div className="pm-gameover__scores">
        {players.map((player, seat) => (
          <div
            key={player.player_id}
            className={`pm-gameover__score-card ${
              player.player_id === winnerId ? "pm-gameover__score-card--winner" : ""
            }`}
          >
            <img className="pm-gameover__token" src={SEAT_ART[seat]} alt="" aria-hidden="true" />
            <p className="pm-player-card__name">{player.nickname}</p>
            <p className="pm-gameover__score-value">{player.score}점</p>
            <p className="pm-gameover__steps">{player.steps_moved}칸 이동</p>
          </div>
        ))}
      </div>

      <p className="pm-gameover__summary">{chemistrySummary}</p>

      <div className="pm-gameover__actions">
        <button type="button" className="pm-button pm-button--primary" onClick={onRestart}>
          다시 하기
        </button>
        <button type="button" className="pm-button pm-button--ghost" onClick={onExit}>
          나가기
        </button>
      </div>
    </div>
  );
}
