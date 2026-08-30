import { useEffect, useState } from "react";
import { advancePhase, submitNightAction } from "../api/client";
import { NIGHT_EFFECT_IMAGES } from "../assets/images";
import { NightEffectOverlay } from "../components/NightEffectOverlay";
import { useCountdown } from "../hooks/useCountdown";
import type { PlayerSession } from "../hooks/usePlayerSession";
import type { InvestigationResult, MyView, Role, RoomState } from "../api/types";

const ROLE_ACTION: Partial<Record<Role, string>> = {
  mafia: "kill",
  police: "investigate",
  doctor: "protect",
};

const ROLE_PROMPT: Partial<Record<Role, string>> = {
  mafia: "제거할 대상을 선택하세요",
  police: "조사할 대상을 선택하세요",
  doctor: "보호할 대상을 선택하세요",
};

interface NightPageProps {
  session: PlayerSession;
  state: RoomState;
  myView: MyView;
}

export function NightPage({ session, state, myView }: NightPageProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [nightActionEffect, setNightActionEffect] = useState<"knife" | "angel" | null>(null);
  const [investigateResult, setInvestigateResult] = useState<InvestigationResult | null>(null);
  const [showInvestigateEffect, setShowInvestigateEffect] = useState(false);
  const [lastRevealNight, setLastRevealNight] = useState<number | null>(null);
  const [showDetectiveReveal, setShowDetectiveReveal] = useState(false);
  const [lastExecutionNight, setLastExecutionNight] = useState<number | null>(null);
  const [executionEffect, setExecutionEffect] = useState<"executed" | "spared" | null>(null);
  const remaining = useCountdown(state.phase_deadline);
  const alivePlayers = state.players.filter((p) => p.is_alive);
  const role = myView.role;
  const actionType = role ? ROLE_ACTION[role] : undefined;

  useEffect(() => {
    if (lastRevealNight === state.night_number) return;
    setLastRevealNight(state.night_number);
    if (myView.investigation_result?.is_mafia) {
      setShowDetectiveReveal(true);
    }
  }, [myView.investigation_result, lastRevealNight, state.night_number]);

  useEffect(() => {
    if (lastExecutionNight === state.night_number) return;
    setLastExecutionNight(state.night_number);
    if (state.execution_result) {
      setExecutionEffect(state.execution_result.executed ? "executed" : "spared");
    }
  }, [state.execution_result, lastExecutionNight, state.night_number]);

  const handleSkip = () => {
    advancePhase(session.roomId);
  };

  const executionResultPanel = state.execution_result && (
    <p className="fate-note">
      {state.execution_result.executed
        ? `${state.execution_result.nickname}님이 처형당했습니다.`
        : `${state.execution_result.nickname}님이 무죄로 풀려났습니다.`}
    </p>
  );

  const executionEffectOverlay = executionEffect && (
    <NightEffectOverlay
      kind={executionEffect}
      imageSrc={NIGHT_EFFECT_IMAGES[executionEffect]}
      onDone={() => setExecutionEffect(null)}
    />
  );

  if (!actionType || !role) {
    return (
      <div className="card stack-lg">
        <h2>밤 {state.night_number}차</h2>
        <p>밤이 되었습니다. 다른 사람들이 움직이는 동안 기다려주세요.</p>
        <p className="countdown">⏱ 남은 시간: {remaining}초</p>
        {executionResultPanel}
        {session.isHost && (
          <button className="btn btn-secondary btn-block" onClick={handleSkip}>
            건너뛰기 (관리자)
          </button>
        )}
        {executionEffectOverlay}
      </div>
    );
  }

  const handleAct = async (targetId: string) => {
    if (submitting) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const response = await submitNightAction(session.roomId, session.playerId, actionType, targetId);
      if (role === "police") {
        // 조사는 클릭 즉시 결과를 보여준다 — "조사 중..." 대기 없이, 그리고
        // 밤이 곧바로 다음 단계로 넘어가 화면이 통째로 사라지기 전에 결과가
        // 이미 렌더링되어 있도록 한다.
        setInvestigateResult(response.investigation_result ?? null);
        setShowInvestigateEffect(true);
        return;
      }
      setSubmitted(true);
      if (role === "mafia") {
        setNightActionEffect("knife");
      } else if (role === "doctor") {
        setNightActionEffect("angel");
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "능력 사용에 실패했습니다. 밤이 이미 끝났을 수 있습니다."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const targets = alivePlayers.filter((p) => p.player_id !== session.playerId || role === "doctor");

  const renderBody = () => {
    if (role === "police") {
      if (investigateResult) {
        return (
          <p className="fate-note">{investigateResult.is_mafia ? "마피아입니다!" : "시민입니다"}</p>
        );
      }
    } else if (submitted) {
      return <p>능력을 사용했습니다. 아침을 기다려주세요.</p>;
    }

    return (
      <ul className="target-list">
        {targets.map((p) => (
          <li key={p.player_id} className="target-row">
            <span className="player-name">{p.nickname}</span>
            <button
              className="btn btn-secondary"
              onClick={() => handleAct(p.player_id)}
              disabled={submitting}
            >
              {ROLE_PROMPT[role]}
            </button>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="card stack-lg">
      <h2>밤 {state.night_number}차</h2>
      <p className="countdown">⏱ 남은 시간: {remaining}초</p>
      {myView.investigation_result && (
        <p className="fate-note">
          지난 밤 조사 결과: {myView.investigation_result.is_mafia ? "마피아입니다!" : "마피아가 아닙니다."}
        </p>
      )}
      {executionResultPanel}
      {renderBody()}
      {actionError && (
        <p role="alert" className="alert-error">
          {actionError}
        </p>
      )}
      {session.isHost && (
        <button className="btn btn-secondary btn-block" onClick={handleSkip}>
          건너뛰기 (관리자)
        </button>
      )}
      {nightActionEffect && (
        <NightEffectOverlay
          kind={nightActionEffect}
          imageSrc={NIGHT_EFFECT_IMAGES[nightActionEffect]}
          onDone={() => setNightActionEffect(null)}
        />
      )}
      {showInvestigateEffect && (
        <NightEffectOverlay
          kind="detective"
          imageSrc={NIGHT_EFFECT_IMAGES.detective}
          onDone={() => setShowInvestigateEffect(false)}
        />
      )}
      {showDetectiveReveal && (
        <NightEffectOverlay
          kind="detective"
          imageSrc={NIGHT_EFFECT_IMAGES.detective}
          onDone={() => setShowDetectiveReveal(false)}
        />
      )}
      {executionEffectOverlay}
    </div>
  );
}
