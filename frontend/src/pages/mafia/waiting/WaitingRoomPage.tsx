import { useState } from "react";
import { fillTestPlayers, startGame, submitMockPersona, updatePlayerCount } from "../api/client";
import type { PlayerSession } from "../hooks/usePlayerSession";
import type { RoomState } from "../api/types";
import { PLAYER_COUNT_OPTIONS } from "../constants";
import "./WaitingRoomPage.css";

interface WaitingRoomPageProps {
  session: PlayerSession;
  state: RoomState;
}

export function WaitingRoomPage({ session, state }: WaitingRoomPageProps) {
  const [error, setError] = useState<string | null>(null);
  const [filling, setFilling] = useState(false);
  const [fillingPlayers, setFillingPlayers] = useState(false);
  const [changingCount, setChangingCount] = useState(false);
  const isHost = state.host_player_id === session.playerId;
  const isFull = state.players.length === state.player_count;

  const handleChangePlayerCount = async (count: number) => {
    setError(null);
    setChangingCount(true);
    try {
      await updatePlayerCount(session.roomId, count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "인원수 변경에 실패했습니다.");
    } finally {
      setChangingCount(false);
    }
  };

  const handleFillTestPlayers = async () => {
    setError(null);
    setFillingPlayers(true);
    try {
      await fillTestPlayers(session.roomId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "테스트 인원 채우기에 실패했습니다.");
    } finally {
      setFillingPlayers(false);
    }
  };

  const handleFillMockPersona = async () => {
    setError(null);
    setFilling(true);
    try {
      await submitMockPersona(session.roomId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "성향 데이터 생성에 실패했습니다.");
    } finally {
      setFilling(false);
    }
  };

  const handleStart = async () => {
    setError(null);
    try {
      await startGame(session.roomId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "게임 시작에 실패했습니다.");
    }
  };

  return (
    <div className="card stack-lg">
      <div className="stack">
        <h1>대기실</h1>
        <p>
          방 코드: <strong className="room-code">{session.roomId}</strong>
        </p>
      </div>

      <div className="stack">
        <div className="row-between">
          <h2>참가자</h2>
          <span className="progress-count">
            {state.players.length} / {state.player_count}명 참가 중
          </span>
        </div>
        <ul className="player-list">
          {state.players.map((p) => (
            <li key={p.player_id} className="player-row">
              <span className="player-avatar">{p.nickname.charAt(0)}</span>
              <span className="player-name">
                {p.nickname}
                {p.player_id === state.host_player_id && <span className="host-tag">방장</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {isHost && (
        <div className="stack">
          <h2>인원수</h2>
          <div className="count-options">
            {PLAYER_COUNT_OPTIONS.map((count) => (
              <button
                key={count}
                className={`btn ${count === state.player_count ? "btn-primary" : "btn-secondary"}`}
                onClick={() => handleChangePlayerCount(count)}
                disabled={changingCount || count < state.players.length}
              >
                {count}명
              </button>
            ))}
          </div>
        </div>
      )}

      <p className={state.personas_ready ? "status-ready" : "status-pending"}>
        {state.personas_ready ? "✓ 성향 데이터 준비 완료" : "성향 데이터 대기 중..."}
      </p>

      {isHost ? (
        <div className="stack">
          {!isFull && (
            <button
              className="btn btn-secondary btn-block"
              onClick={handleFillTestPlayers}
              disabled={fillingPlayers}
            >
              {fillingPlayers
                ? "채우는 중..."
                : "테스트용 나머지 인원 채우기 (혼자 테스트할 때)"}
            </button>
          )}
          <button
            className="btn btn-secondary btn-block"
            onClick={handleFillMockPersona}
            disabled={filling}
          >
            {filling ? "채우는 중..." : "무작위 성향 데이터 채우기 (테스트용)"}
          </button>
          <button
            className="btn btn-primary btn-block"
            onClick={handleStart}
            disabled={!isFull || !state.personas_ready}
          >
            게임 시작
          </button>
        </div>
      ) : (
        <p>방장이 게임을 시작하길 기다리는 중...</p>
      )}

      {error && (
        <p role="alert" className="alert-error">
          {error}
        </p>
      )}
    </div>
  );
}
