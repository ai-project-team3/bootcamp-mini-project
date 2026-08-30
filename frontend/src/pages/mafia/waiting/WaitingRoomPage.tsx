import { useState } from "react";
import { fillTestPlayers, startGame, submitMockPersona, updatePlayerCount } from "../api/client";
import type { PlayerSession } from "../hooks/usePlayerSession";
import type { RoomState } from "../api/types";
import { PLAYER_COUNT_OPTIONS } from "../constants";
import RoomWaitingLayout from "../../../components/room/RoomWaitingLayout";

interface WaitingRoomPageProps {
  session: PlayerSession;
  state: RoomState;
}

/** Anyone opening this link lands on the mafia entry with the code prefilled. */
function inviteLink(roomId: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}?room=${roomId}`;
}

/**
 * 마피아's waiting room, drawn by the app's shared one.
 *
 * Mafia's own controls — the table size and the solo-testing shortcuts — hang
 * in the layout's slots instead of the game drawing a second kind of room.
 */
export function WaitingRoomPage({ session, state }: WaitingRoomPageProps) {
  const [error, setError] = useState<string | null>(null);
  const [filling, setFilling] = useState(false);
  const [fillingPlayers, setFillingPlayers] = useState(false);
  const [changingCount, setChangingCount] = useState(false);
  const isHost = state.host_player_id === session.playerId;
  const isFull = state.players.length === state.player_count;
  const remaining = Math.max(state.player_count - state.players.length, 0);

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
    <RoomWaitingLayout
      tone="dark"
      eyebrow="대기실"
      title={<>같이 할 사람을<br />기다리고 있어요</>}
      lead={`${state.players.length} / ${state.player_count}명 참가 중 · ${
        isFull ? "모두 모였어요" : `${remaining}명 더 기다리는 중`
      }`}
      code={session.roomId}
      inviteUrl={inviteLink(session.roomId)}
      players={state.players.map((p) => ({
        id: p.player_id,
        nickname: p.nickname,
        isHost: p.player_id === state.host_player_id,
        isMe: p.player_id === session.playerId,
      }))}
      emptySeats={remaining}
      error={error}
      options={
        isHost ? (
          <div className="game-room-option-group">
            <span className="game-room-option-label">인원수</span>
            <div className="game-room-chips" role="group" aria-label="인원수">
              {PLAYER_COUNT_OPTIONS.map((count) => (
                <button
                  key={count}
                  type="button"
                  className="game-room-chip"
                  aria-pressed={count === state.player_count}
                  onClick={() => handleChangePlayerCount(count)}
                  // Shrinking below the people already here would strand them.
                  disabled={changingCount || count < state.players.length}
                >
                  {count}명
                </button>
              ))}
            </div>
          </div>
        ) : null
      }
      notes={
        <p className={state.personas_ready ? "game-room-note-ready" : undefined}>
          {state.personas_ready ? "✓ 성향 데이터 준비 완료" : "성향 데이터 대기 중..."}
        </p>
      }
      hostTools={
        isHost ? (
          <>
            {!isFull && (
              <button
                className="btn btn-secondary"
                onClick={handleFillTestPlayers}
                disabled={fillingPlayers}
              >
                {fillingPlayers ? "채우는 중..." : "테스트용 나머지 인원 채우기 (혼자 테스트할 때)"}
              </button>
            )}
            <button className="btn btn-secondary" onClick={handleFillMockPersona} disabled={filling}>
              {filling ? "채우는 중..." : "무작위 성향 데이터 채우기 (테스트용)"}
            </button>
          </>
        ) : null
      }
      footer={
        isHost ? (
          <button
            className="btn btn-primary btn-block"
            onClick={handleStart}
            disabled={!isFull || !state.personas_ready}
          >
            게임 시작
          </button>
        ) : (
          <p className="game-room-notes">방장이 게임을 시작하길 기다리는 중...</p>
        )
      }
    />
  );
}
