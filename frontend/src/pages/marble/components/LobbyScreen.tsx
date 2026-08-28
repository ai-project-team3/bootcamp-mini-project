import { useState } from "react";
import type { ContentMode } from "../api/types";
import { PLAYER_COUNT_OPTIONS } from "../constants";
import RoomEntryLayout from "../../../components/room/RoomEntryLayout";

interface LobbyScreenProps {
  contentMode: ContentMode;
  onContentModeChange: (mode: ContentMode) => void;
  maxPlayers: number;
  onMaxPlayersChange: (count: number) => void;
  onCreate: (nickname: string) => void;
  onJoin: (roomId: string, nickname: string) => void;
  /** Prefilled from an invite link's ?room= parameter. */
  initialRoomCode?: string;
  busy?: boolean;
  error?: string | null;
}

/**
 * 커플 브루마블's room-creation screen, drawn by the app's shared one.
 *
 * What only marble needs — the content mode and how many seats to lay out —
 * goes in the options slot. The mode also decides the screen's palette, since
 * 19금 모드 plays in the dark.
 */
export function LobbyScreen({
  contentMode,
  onContentModeChange,
  maxPlayers,
  onMaxPlayersChange,
  onCreate,
  onJoin,
  initialRoomCode = "",
  busy,
  error,
}: LobbyScreenProps) {
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [localError, setLocalError] = useState<string | null>(null);

  const trimmedNickname = nickname.trim();
  const trimmedCode = roomCode.trim().toUpperCase();

  const handleCreate = () => {
    if (!trimmedNickname) {
      setLocalError("닉네임을 입력해주세요.");
      return;
    }
    setLocalError(null);
    onCreate(trimmedNickname);
  };

  const handleJoin = () => {
    if (!trimmedNickname || !trimmedCode) {
      setLocalError("닉네임과 초대코드를 모두 입력해주세요.");
      return;
    }
    setLocalError(null);
    onJoin(trimmedCode, trimmedNickname);
  };

  return (
    <RoomEntryLayout
      idPrefix="marble"
      tone={contentMode === "adult" ? "dark" : "light"}
      eyebrow="PERSONA MARBLE"
      title="커플 브루마블"
      lead="성향 데이터로 만들어지는 보드게임이에요. 먼저 한 바퀴를 완주하면 승리합니다."
      nickname={nickname}
      onNicknameChange={setNickname}
      nicknamePlaceholder="이름을 입력하세요"
      roomCode={roomCode}
      onRoomCodeChange={setRoomCode}
      codeLocked={Boolean(initialRoomCode)}
      onCreate={handleCreate}
      onJoin={handleJoin}
      busy={busy}
      error={error ?? localError}
      options={
        <>
          <div className="game-room-option-group">
            <span className="game-room-option-label">모드</span>
            <div className="game-room-modes" role="group" aria-label="모드">
              <button
                type="button"
                data-testid="pm-mode-general"
                className="game-room-mode"
                aria-pressed={contentMode === "general"}
                onClick={() => onContentModeChange("general")}
              >
                <span className="game-room-mode-icon" aria-hidden="true">
                  🌤️
                </span>
                <b>일반 모드</b>
                <small>귀엽고 유쾌한 질문과 벌칙</small>
              </button>
              <button
                type="button"
                data-testid="pm-mode-adult"
                className="game-room-mode"
                aria-pressed={contentMode === "adult"}
                onClick={() => onContentModeChange("adult")}
              >
                <span className="game-room-mode-icon" aria-hidden="true">
                  🌙
                </span>
                <b>19금 모드</b>
                <small>더 과감한 질문과 벌칙, 벌칙 받을 사람은 추첨</small>
              </button>
            </div>
          </div>

          <div className="game-room-option-group">
            <span className="game-room-option-label">참여 인원</span>
            <div className="game-room-chips" role="group" aria-label="참여 인원">
              {PLAYER_COUNT_OPTIONS.map((count) => (
                <button
                  key={count}
                  type="button"
                  className="game-room-chip"
                  aria-pressed={maxPlayers === count}
                  onClick={() => onMaxPlayersChange(count)}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
        </>
      }
    />
  );
}
