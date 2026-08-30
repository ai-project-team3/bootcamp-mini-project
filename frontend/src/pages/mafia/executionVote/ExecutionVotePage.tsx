import { useState } from "react";
import { advancePhase, submitExecutionVote } from "../api/client";
import { useCountdown } from "../hooks/useCountdown";
import type { PlayerSession } from "../hooks/usePlayerSession";
import type { ExecutionVerdict, RoomState } from "../api/types";
import "./ExecutionVotePage.css";

interface ExecutionVotePageProps {
  session: PlayerSession;
  state: RoomState;
}

export function ExecutionVotePage({ session, state }: ExecutionVotePageProps) {
  const [verdict, setVerdict] = useState<ExecutionVerdict | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const remaining = useCountdown(state.phase_deadline);
  const accused = state.players.find((p) => p.player_id === state.accused_player_id);
  const isAccused = session.playerId === state.accused_player_id;

  const handleSkip = () => {
    advancePhase(session.roomId);
  };

  const handleConfirm = async () => {
    if (!verdict || submitting) return;
    setSubmitting(true);
    try {
      await submitExecutionVote(session.roomId, session.playerId, verdict);
      setConfirmed(true);
    } catch {
      // 이미 마감되었거나 잠긴 투표 등 실패 시에는 조용히 현재 화면을 유지한다.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card stack-lg">
      <div className="stack">
        <h2>낮 {state.day_number}일차 - 찬반 투표</h2>
        <h1>{accused ? `${accused.nickname}님을 처형할까요?` : "처형할까요?"}</h1>
        <p className="countdown">⏱ 남은 시간: {remaining}초</p>
      </div>

      {isAccused ? (
        <p>당신은 이번 투표에 참여할 수 없습니다.</p>
      ) : confirmed ? (
        <p>투표를 완료했습니다. 다른 사람을 기다리는 중...</p>
      ) : (
        <>
          <div className="verdict-buttons">
            <button
              className={`btn btn-secondary verdict-btn--guilty ${verdict === "guilty" ? "is-selected" : ""}`}
              onClick={() => setVerdict("guilty")}
            >
              찬성 (처형)
            </button>
            <button
              className={`btn btn-secondary verdict-btn--innocent ${verdict === "innocent" ? "is-selected" : ""}`}
              onClick={() => setVerdict("innocent")}
            >
              반대 (생존)
            </button>
          </div>
          <button
            className="btn btn-primary btn-block"
            onClick={handleConfirm}
            disabled={!verdict || submitting}
          >
            투표 완료
          </button>
        </>
      )}
      {session.isHost && (
        <button className="btn btn-secondary btn-block" onClick={handleSkip}>
          건너뛰기 (관리자)
        </button>
      )}
    </div>
  );
}
