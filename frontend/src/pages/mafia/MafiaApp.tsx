import { useEffect, useState } from "react";
import { HomePage } from "./home/HomePage";
import { WaitingRoomPage } from "./waiting/WaitingRoomPage";
import { RoleRevealPage } from "./roleReveal/RoleRevealPage";
import { DayPage } from "./day/DayPage";
import { FinalDefensePage } from "./finalDefense/FinalDefensePage";
import { ExecutionVotePage } from "./executionVote/ExecutionVotePage";
import { NightPage } from "./night/NightPage";
import { ResultPage } from "./result/ResultPage";
import { usePlayerSession } from "./hooks/usePlayerSession";
import { useRoomState } from "./hooks/useRoomState";
import { getMyView } from "./api/client";
import type { GamePhase, MyView } from "./api/types";

/** Someone who followed an invite link arrives with the room code in the URL. */
function readInviteCode(): string {
  try {
    return new URLSearchParams(window.location.search).get("room")?.toUpperCase() ?? "";
  } catch {
    return "";
  }
}

const ROLE_REVEALED_PHASES: GamePhase[] = [
  "ROLE_ASSIGNMENT",
  "DAY_DISCUSSION",
  "DAY_VOTE",
  "FINAL_DEFENSE",
  "EXECUTION_VOTE",
  "NIGHT_ACTION",
];

export function MafiaApp() {
  const { session, setSession, clearSession } = usePlayerSession();
  const { state, error } = useRoomState(session?.roomId ?? null);
  const [myView, setMyView] = useState<MyView | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [inviteCode] = useState(readInviteCode);

  useEffect(() => {
    if (!session || !state) return;
    if (!ROLE_REVEALED_PHASES.includes(state.phase)) return;
    getMyView(session.roomId, session.playerId).then(setMyView);
  }, [session, state?.phase]);

  useEffect(() => {
    if (!error || !error.includes("404")) return;
    setNotice("이전 방을 찾을 수 없어요. 새로 시작해주세요.");
    clearSession();
  }, [error, clearSession]);

  const renderPage = () => {
    if (!session) {
      return <HomePage onJoined={setSession} notice={notice} initialRoomCode={inviteCode} />;
    }

    if (!state) {
      return <p>방 정보를 불러오는 중...</p>;
    }

    switch (state.phase) {
      case "WAITING_ROOM":
        return <WaitingRoomPage session={session} state={state} />;
      case "ROLE_ASSIGNMENT":
        return myView ? (
          <RoleRevealPage session={session} state={state} myView={myView} />
        ) : (
          <p>직업을 배정하는 중...</p>
        );
      case "DAY_DISCUSSION":
      case "DAY_VOTE":
        return <DayPage session={session} state={state} myView={myView} />;
      case "FINAL_DEFENSE":
        return <FinalDefensePage session={session} state={state} />;
      case "EXECUTION_VOTE":
        return <ExecutionVotePage session={session} state={state} />;
      case "NIGHT_ACTION":
        return myView ? (
          <NightPage session={session} state={state} myView={myView} />
        ) : (
          <p>밤이 되는 중...</p>
        );
      case "RESULT":
        return <ResultPage session={session} />;
      default:
        return null;
    }
  };

  return (
    <div className="mafia-app">
      <div className="app-shell">{renderPage()}</div>
    </div>
  );
}
