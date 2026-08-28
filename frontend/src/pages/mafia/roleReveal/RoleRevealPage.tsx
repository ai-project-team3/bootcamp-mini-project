import { advancePhase } from "../api/client";
import { ROLE_PORTRAITS } from "../assets/images";
import { useCountdown } from "../hooks/useCountdown";
import type { PlayerSession } from "../hooks/usePlayerSession";
import type { MyView, Role, RoomState } from "../api/types";
import "./RoleRevealPage.css";

const ROLE_LABELS: Record<Role, string> = {
  mafia: "마피아",
  police: "경찰",
  doctor: "의사",
  citizen: "시민",
};

interface RoleRevealPageProps {
  session: PlayerSession;
  state: RoomState;
  myView: MyView;
}

export function RoleRevealPage({ session, state, myView }: RoleRevealPageProps) {
  const remaining = useCountdown(state.phase_deadline);

  const handleSkip = () => {
    advancePhase(session.roomId);
  };

  return (
    <div className="card stack-lg">
      <h2>당신의 직업</h2>
      {myView.role && (
        <img
          className="role-portrait"
          src={ROLE_PORTRAITS[myView.role]}
          alt={`${ROLE_LABELS[myView.role]} 역할 이미지`}
        />
      )}
      <p data-testid="role-label" className={`role-badge ${myView.role ? `role-badge--${myView.role}` : ""}`}>
        {myView.role ? ROLE_LABELS[myView.role] : "배정 중..."}
      </p>
      {myView.assigned_by === "fallback_random" && (
        <p className="fate-note">운명이 이 역할을 선택했습니다.</p>
      )}
      <p className="countdown">⏱ 잠시 후 낮이 시작됩니다: {remaining}초</p>
      {session.isHost && (
        <button className="btn btn-secondary btn-block" onClick={handleSkip}>
          건너뛰기 (관리자)
        </button>
      )}
    </div>
  );
}
