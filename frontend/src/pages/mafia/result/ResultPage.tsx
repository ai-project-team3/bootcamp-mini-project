import { useEffect, useState } from "react";
import { getResult, restartRoom } from "../api/client";
import { PersonaRadarChart } from "../components/PersonaRadarChart";
import { buildMatchReason } from "../utils/matchReason";
import { computeSuperlatives } from "../utils/superlatives";
import type { PlayerSession } from "../hooks/usePlayerSession";
import type { GameResult, Role } from "../api/types";
import "./ResultPage.css";

const ROLE_LABELS: Record<Role, string> = {
  mafia: "마피아",
  police: "경찰",
  doctor: "의사",
  citizen: "시민",
};

interface ResultPageProps {
  session: PlayerSession;
}

export function ResultPage({ session }: ResultPageProps) {
  const [result, setResult] = useState<GameResult | null>(null);
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    getResult(session.roomId).then(setResult);
  }, [session.roomId]);

  const handleRestart = async () => {
    if (restarting) return;
    setRestarting(true);
    try {
      await restartRoom(session.roomId);
    } catch {
      // 실패 시에는 조용히 현재 화면을 유지한다.
    } finally {
      setRestarting(false);
    }
  };

  if (!result) {
    return (
      <div className="card">
        <p>결과를 불러오는 중...</p>
      </div>
    );
  }

  const superlatives = computeSuperlatives(result.players);
  const isMafiaWin = result.winner === "mafia";

  return (
    <div className="card card--wide stack-lg">
      <div className={`winner-banner ${isMafiaWin ? "winner-banner--mafia" : "winner-banner--citizen"}`}>
        <h1>{isMafiaWin ? "마피아 팀 승리!" : "시민 팀 승리!"}</h1>
      </div>

      <section className="stack">
        <h2>시상식</h2>
        <ul className="superlatives">
          {superlatives.map((s) => (
            <li key={s.title}>
              <span className="superlative-title">{s.title}</span>
              <span className="superlative-name">{s.player.nickname}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="result-players">
        {result.players.map((p) => (
          <article key={p.player_id} className={`player-result-card ${p.is_alive ? "" : "is-dead"}`}>
            <div className="player-result-header">
              <h3 className="player-result-name">
                {p.nickname} - {ROLE_LABELS[p.role]}
              </h3>
              <span className={`role-pill role-pill--${p.role}`}>{ROLE_LABELS[p.role]}</span>
            </div>
            <div className="radar-wrap">
              <PersonaRadarChart persona={p.persona_scores} />
            </div>
            <p className="match-reason">{buildMatchReason(p)}</p>
          </article>
        ))}
      </section>

      <button className="btn btn-primary btn-block" onClick={handleRestart} disabled={restarting}>
        {restarting ? "이동하는 중..." : "로비로 이동"}
      </button>
    </div>
  );
}
