import { useEffect, useState } from "react";
import { advancePhase, castVote } from "../api/client";
import { DISCUSSION_SCENE, NIGHT_EFFECT_IMAGES, VOTE_SCENE } from "../assets/images";
import { NightEffectOverlay, type NightEffectKind } from "../components/NightEffectOverlay";
import { useCountdown } from "../hooks/useCountdown";
import type { PlayerSession } from "../hooks/usePlayerSession";
import type { MyView, NightSummary, RoomState } from "../api/types";

interface DayPageProps {
  session: PlayerSession;
  state: RoomState;
  myView?: MyView | null;
}

function describeNightSummary(summary: NightSummary): string {
  if (!summary.attacked_nickname) {
    return "지난밤 아무 일도 일어나지 않았습니다.";
  }
  if (summary.died) {
    return `${summary.attacked_nickname}님이 사망했습니다.`;
  }
  return `${summary.attacked_nickname}님이 마피아의 습격을 받았지만 의사가 살렸습니다!`;
}

export function DayPage({ session, state, myView }: DayPageProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastRecapDay, setLastRecapDay] = useState<number | null>(null);
  const [nightEffect, setNightEffect] = useState<NightEffectKind | null>(null);
  const [shaking, setShaking] = useState(false);
  const remaining = useCountdown(state.phase_deadline);
  const alivePlayers = state.players.filter((p) => p.is_alive);
  const morningRecap = state.day_number > 1 && state.night_summary ? state.night_summary : null;

  useEffect(() => {
    if (!morningRecap || lastRecapDay === state.day_number) return;
    setLastRecapDay(state.day_number);
    if (!morningRecap.attacked_nickname) return;
    if (morningRecap.died) {
      setNightEffect("knife");
      setShaking(true);
      window.setTimeout(() => setShaking(false), 500);
    } else {
      setNightEffect("angel");
    }
  }, [morningRecap, lastRecapDay, state.day_number]);

  const handleSkip = () => {
    advancePhase(session.roomId);
  };

  if (state.phase === "DAY_DISCUSSION") {
    return (
      <div className={`card stack-lg ${shaking ? "screen-shake" : ""}`}>
        <div className="stack">
          <h2>낮 {state.day_number}일차</h2>
          <h1>토론 시간</h1>
          <p className="countdown">⏱ 남은 시간: {remaining}초</p>
        </div>
        <img className="scene-image" src={DISCUSSION_SCENE} alt="토론 시간 삽화" />
        {morningRecap && <p className="alert-notice">{describeNightSummary(morningRecap)}</p>}
        {myView?.role === "police" && myView.investigation_result && (
          <p className="fate-note">
            지난 밤 조사 결과:{" "}
            {myView.investigation_result.is_mafia ? "마피아입니다!" : "마피아가 아닙니다."}
          </p>
        )}
        <p>누가 마피아인지 이야기해보세요.</p>
        {session.isHost && (
          <button className="btn btn-secondary btn-block" onClick={handleSkip}>
            건너뛰기 (관리자)
          </button>
        )}
        {nightEffect && (
          <NightEffectOverlay
            kind={nightEffect}
            imageSrc={NIGHT_EFFECT_IMAGES[nightEffect]}
            onDone={() => setNightEffect(null)}
          />
        )}
      </div>
    );
  }

  const handleConfirm = async () => {
    if (!selectedTargetId || submitting) return;
    setSubmitting(true);
    try {
      await castVote(session.roomId, session.playerId, selectedTargetId);
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
        <h2>낮 {state.day_number}일차</h2>
        <h1>누구를 지목할까요?</h1>
        <p className="countdown">⏱ 남은 시간: {remaining}초</p>
      </div>
      <img className="scene-image" src={VOTE_SCENE} alt="투표 시간 삽화" />
      {confirmed ? (
        <p>투표를 완료했습니다. 다른 사람을 기다리는 중...</p>
      ) : (
        <>
          <ul className="target-list">
            {alivePlayers.map((p) => (
              <li
                key={p.player_id}
                className={`target-row ${selectedTargetId === p.player_id ? "is-selected" : ""}`}
              >
                <span className="player-name">{p.nickname}</span>
                <button className="btn btn-secondary" onClick={() => setSelectedTargetId(p.player_id)}>
                  {selectedTargetId === p.player_id ? "선택됨" : "지목하기"}
                </button>
              </li>
            ))}
          </ul>
          <button
            className="btn btn-primary btn-block"
            onClick={handleConfirm}
            disabled={!selectedTargetId || submitting}
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
