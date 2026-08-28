import { advancePhase } from "../api/client";
import { FINAL_DEFENSE_SCENE } from "../assets/images";
import { useCountdown } from "../hooks/useCountdown";
import type { PlayerSession } from "../hooks/usePlayerSession";
import type { RoomState } from "../api/types";

interface FinalDefensePageProps {
  session: PlayerSession;
  state: RoomState;
}

export function FinalDefensePage({ session, state }: FinalDefensePageProps) {
  const remaining = useCountdown(state.phase_deadline);
  const accused = state.players.find((p) => p.player_id === state.accused_player_id);

  const handleSkip = () => {
    advancePhase(session.roomId);
  };

  return (
    <div className="card stack-lg">
      <div className="stack">
        <h2>낮 {state.day_number}일차 - 최후 변론</h2>
        <h1>{accused ? `${accused.nickname}님의 최후 변론 시간입니다` : "최후 변론 시간입니다"}</h1>
        <p className="countdown">⏱ 남은 시간: {remaining}초</p>
      </div>
      <img className="scene-image" src={FINAL_DEFENSE_SCENE} alt="최후 변론 삽화" />
      <p>지목된 사람은 자신이 마피아가 아닌 이유를 이야기해보세요.</p>
      {session.isHost && (
        <button className="btn btn-secondary btn-block" onClick={handleSkip}>
          건너뛰기 (관리자)
        </button>
      )}
    </div>
  );
}
