import { useState } from "react";
import { createRoom, joinRoom } from "../api/client";
import type { PlayerSession } from "../hooks/usePlayerSession";
import { PLAYER_COUNT_OPTIONS } from "../constants";
import RoomEntryLayout from "../../../components/room/RoomEntryLayout";

interface HomePageProps {
  onJoined: (session: PlayerSession) => void;
  notice?: string | null;
  /** Prefilled when someone followed an invite link carrying ?room=. */
  initialRoomCode?: string;
}

/**
 * 마피아's room-creation screen.
 *
 * The screen itself is the app's shared one, so making a mafia room feels like
 * making any other room. The only thing mafia adds is the table size, because
 * the roles are dealt from it — that goes in the layout's options slot.
 */
export function HomePage({ onJoined, notice, initialRoomCode = "" }: HomePageProps) {
  const [nickname, setNickname] = useState("");
  const [joinRoomId, setJoinRoomId] = useState(initialRoomCode);
  const [playerCount, setPlayerCount] = useState(4);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!nickname.trim()) {
      setError("닉네임을 입력해주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { room_id } = await createRoom(playerCount);
      const { player_id, is_host } = await joinRoom(room_id, nickname);
      onJoined({ roomId: room_id, playerId: player_id, isHost: is_host });
    } catch (err) {
      setError(err instanceof Error ? err.message : "방 생성에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    const code = joinRoomId.trim();
    if (!nickname.trim() || !code) {
      setError("닉네임과 초대코드를 모두 입력해주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { player_id, is_host } = await joinRoom(code, nickname);
      onJoined({ roomId: code, playerId: player_id, isHost: is_host });
    } catch (err) {
      setError(err instanceof Error ? err.message : "참가에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <RoomEntryLayout
      idPrefix="mafia"
      tone="dark"
      eyebrow="PERSONA MAFIA"
      title="마피아 게임"
      lead="성향 데이터로 직업이 정해지는 아이스브레이킹 마피아"
      nickname={nickname}
      onNicknameChange={setNickname}
      nicknamePlaceholder="테이블에서 불릴 이름"
      roomCode={joinRoomId}
      onRoomCodeChange={setJoinRoomId}
      onCreate={handleCreate}
      onJoin={handleJoin}
      busy={busy}
      error={error ?? notice ?? null}
      options={
        <div className="game-room-option-group">
          <span className="game-room-option-label">인원수</span>
          <div className="game-room-chips" role="group" aria-label="인원수">
            {PLAYER_COUNT_OPTIONS.map((count) => (
              <button
                key={count}
                type="button"
                className="game-room-chip"
                aria-pressed={playerCount === count}
                onClick={() => setPlayerCount(count)}
              >
                {count}명
              </button>
            ))}
          </div>
          <span className="game-room-option-note">
            마피아 1명, 의사 1명, 경찰 1명에 나머지는 시민이에요.
          </span>
        </div>
      }
    />
  );
}
