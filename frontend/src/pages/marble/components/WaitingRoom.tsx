import type { RoomState } from "../api/types";
import { seatArt } from "./seatArt";
import { PLAYER_COUNT_OPTIONS } from "../constants";
import RoomWaitingLayout from "../../../components/room/RoomWaitingLayout";

interface WaitingRoomProps {
  state: RoomState;
  playerId: string;
  onStart: () => void;
  onLeave: () => void;
  /** Host-only: resize the room while people are still arriving. */
  onChangeMaxPlayers: (count: number) => void;
  starting?: boolean;
  error?: string | null;
}

/** Anyone opening this link lands on the join form with the code prefilled. */
function inviteLink(roomId: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}?room=${roomId}`;
}

/**
 * 커플 브루마블's waiting room, drawn by the app's shared one.
 *
 * Marble keeps two things of its own: each seat shows the token that player
 * will move on the board, and the host can still resize the room while people
 * are arriving.
 */
export function WaitingRoom({
  state,
  playerId,
  onStart,
  onLeave,
  onChangeMaxPlayers,
  starting,
  error,
}: WaitingRoomProps) {
  const isHost = state.host_player_id === playerId;
  const seatCount = state.max_players;
  const joined = state.players.length;
  const isFull = joined >= seatCount;
  const remaining = Math.max(seatCount - joined, 0);
  const isAdult = state.content_mode === "adult";

  return (
    <RoomWaitingLayout
      tone={isAdult ? "dark" : "light"}
      eyebrow="대기실"
      title={isAdult ? "19금 모드" : "일반 모드"}
      lead={`${joined} / ${seatCount}명 · ${
        isFull ? "모두 모였어요" : `${remaining}명 더 들어오면 시작해요`
      }`}
      code={state.room_id}
      inviteUrl={inviteLink(state.room_id)}
      players={state.players.map((p) => ({
        id: p.player_id,
        nickname: p.nickname,
        isHost: p.player_id === state.host_player_id,
        isMe: p.player_id === playerId,
      }))}
      emptySeats={remaining}
      seatAvatar={(seat) => (
        <img className="pm-waiting__seat-token" src={seatArt(seat)} alt="" aria-hidden="true" />
      )}
      error={error}
      options={
        isHost ? (
          <div className="game-room-option-group">
            <span className="game-room-option-label">인원 변경</span>
            <div className="game-room-chips" role="group" aria-label="인원 변경">
              {PLAYER_COUNT_OPTIONS.map((count) => (
                <button
                  key={count}
                  type="button"
                  className="game-room-chip"
                  aria-pressed={seatCount === count}
                  // Shrinking below the people already here would strand them.
                  disabled={count < joined}
                  onClick={() => onChangeMaxPlayers(count)}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
        ) : null
      }
      footer={
        <>
          {isHost ? (
            <button
              type="button"
              className="pm-button pm-button--primary pm-waiting__cta"
              onClick={onStart}
              disabled={!isFull || starting}
            >
              {isFull ? (starting ? "시작하는 중..." : "게임 시작") : `${remaining}명을 더 기다리는 중...`}
            </button>
          ) : (
            <p className="pm-waiting__hint">
              {isFull
                ? "방장이 시작하기를 기다리는 중..."
                : `${remaining}명이 더 들어오면 방장이 시작할 수 있어요.`}
            </p>
          )}

          <button type="button" className="pm-button pm-button--ghost" onClick={onLeave}>
            나가기
          </button>
        </>
      }
    />
  );
}
