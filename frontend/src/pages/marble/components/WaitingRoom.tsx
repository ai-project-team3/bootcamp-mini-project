import { useState } from "react";
import type { RoomState } from "../api/types";
import { seatArt } from "./seatArt";


interface WaitingRoomProps {
  state: RoomState;
  playerId: string;
  onStart: () => void;
  onLeave: () => void;
  starting?: boolean;
  error?: string | null;
}

/** Anyone opening this link lands on the join form with the code prefilled. */
function inviteLink(roomId: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}?room=${roomId}`;
}

export function WaitingRoom({ state, playerId, onStart, onLeave, starting, error }: WaitingRoomProps) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const isHost = state.host_player_id === playerId;
  const seatCount = state.max_players;
  const joined = state.players.length;
  const isFull = joined >= seatCount;
  const remaining = Math.max(seatCount - joined, 0);

  const copy = async (text: string, kind: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      // Clipboard can be blocked; the code stays visible for manual copying.
    }
  };

  return (
    <div className="pm-card pm-waiting">
      <p className="pm-eyebrow">대기실</p>
      <h1 className="pm-heading pm-waiting__title">
        {state.content_mode === "adult" ? "19금 모드" : "일반 모드"}
      </h1>

      <div className="pm-waiting__code-block">
        <span className="pm-waiting__code-label">방 코드</span>
        <button
          type="button"
          className="pm-waiting__code"
          onClick={() => copy(state.room_id, "code")}
          title="눌러서 복사"
        >
          {state.room_id}
        </button>
        <button
          type="button"
          className="pm-button pm-button--ghost pm-waiting__invite"
          onClick={() => copy(inviteLink(state.room_id), "link")}
        >
          {copied === "link" ? "복사됨!" : "초대 링크 복사"}
        </button>
        {copied === "code" && <span className="pm-waiting__copied">코드가 복사됐어요</span>}
      </div>

      <div className="pm-waiting__tally">
        <span className="pm-waiting__tally-count">
          {joined} / {seatCount}명
        </span>
        <span className="pm-waiting__tally-label">
          {isFull ? "모두 모였어요" : `${remaining}명 더 들어오면 시작해요`}
        </span>
        <span className="pm-waiting__tally-bar" aria-hidden="true">
          <span
            className="pm-waiting__tally-fill"
            style={{ width: `${(joined / seatCount) * 100}%` }}
          />
        </span>
      </div>

      <ul className="pm-waiting__seats">
        {Array.from({ length: seatCount }, (_, seat) => {
          const player = state.players[seat];
          return (
            <li
              key={seat}
              className={`pm-waiting__seat ${player ? "pm-waiting__seat--filled" : ""}`}
              data-testid={`pm-seat-${seat}`}
            >
              <img className="pm-waiting__seat-token" src={seatArt(seat)} alt="" aria-hidden="true" />
              {player ? (
                <span className="pm-waiting__seat-name">
                  {player.nickname}
                  {player.player_id === playerId && <em className="pm-waiting__you">나</em>}
                </span>
              ) : (
                <span className="pm-waiting__seat-empty">비어 있음</span>
              )}
            </li>
          );
        })}
      </ul>

      {error && <p className="pm-waiting__error">{error}</p>}

      {isHost ? (
        <button
          type="button"
          className="pm-button pm-button--primary pm-waiting__cta"
          onClick={onStart}
          disabled={!isFull || starting}
        >
          {isFull
            ? starting
              ? "시작하는 중..."
              : "게임 시작"
            : `${remaining}명을 더 기다리는 중...`}
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
    </div>
  );
}
