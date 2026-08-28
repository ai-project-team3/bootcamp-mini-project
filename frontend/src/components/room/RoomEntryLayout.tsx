import type { ReactNode } from "react";
import Button from "../common/Button";
import Card from "../common/Card";
import GameDemoRoomHero from "../common/GameDemoRoomHero";
import "./RoomLayout.css";

export interface RoomEntryLayoutProps {
  /** Small label above the title, e.g. "MINWOO GAME LAB". */
  eyebrow: string;
  title: ReactNode;
  lead: ReactNode;
  /** 마피아 is always dark; 브루마블 turns dark in 19금 모드. */
  tone?: "light" | "dark";
  /** Keeps input ids unique when two of these ever share a page. */
  idPrefix?: string;

  nickname: string;
  onNicknameChange: (value: string) => void;
  nicknamePlaceholder?: string;

  roomCode: string;
  onRoomCodeChange: (value: string) => void;
  /** An invite link filled the code in; the player should not retype it. */
  codeLocked?: boolean;
  codePlaceholder?: string;

  /**
   * Settings that belong to one game only — 마피아's 인원수, 브루마블's 모드.
   * They sit with 방 만들기 because they describe the room being made, and are
   * absent for a game that has nothing to configure.
   */
  options?: ReactNode;

  createLabel?: string;
  joinLabel?: string;
  onCreate: () => void;
  onJoin: () => void;
  busy?: boolean;
  error?: string | null;
}

/**
 * The one room-creation screen every game in the app uses.
 *
 * The markup is the party-game demo's, unchanged, so a player who has made a
 * room once knows this screen everywhere. A game that needs more than a
 * nickname passes `options`.
 */
export function RoomEntryLayout({
  eyebrow,
  title,
  lead,
  tone = "light",
  idPrefix = "room",
  nickname,
  onNicknameChange,
  nicknamePlaceholder = "닉네임을 입력하세요",
  roomCode,
  onRoomCodeChange,
  codeLocked = false,
  codePlaceholder = "예: AB12CD",
  options,
  createLabel = "새 방 만들기",
  joinLabel = "방 참가하기",
  onCreate,
  onJoin,
  busy = false,
  error,
}: RoomEntryLayoutProps) {
  return (
    <div className={`game-room-shell${tone === "dark" ? " game-room-shell--dark" : ""}`}>
      <GameDemoRoomHero eyebrow={eyebrow} title={title}>
        {lead}
      </GameDemoRoomHero>

      <Card className="game-room-entry-card">
        <label htmlFor={`${idPrefix}-nickname`}>닉네임</label>
        <input
          id={`${idPrefix}-nickname`}
          value={nickname}
          onChange={(event) => onNicknameChange(event.target.value)}
          placeholder={nicknamePlaceholder}
          maxLength={12}
          autoComplete="nickname"
          aria-label="닉네임"
        />

        {options && <div className="game-room-options">{options}</div>}

        <Button onClick={onCreate} disabled={busy}>
          {createLabel}
        </Button>

        <div className="game-room-divider">
          <span>또는 초대코드로 참가</span>
        </div>

        <label htmlFor={`${idPrefix}-room-code`}>초대코드</label>
        <input
          id={`${idPrefix}-room-code`}
          value={roomCode}
          onChange={(event) => onRoomCodeChange(event.target.value.toUpperCase())}
          placeholder={codePlaceholder}
          maxLength={6}
          disabled={codeLocked}
          aria-label="초대코드"
        />
        <Button variant="secondary" onClick={onJoin} disabled={busy}>
          {joinLabel}
        </Button>

        {error && (
          <p className="game-room-error" role="alert">
            {error}
          </p>
        )}
      </Card>
    </div>
  );
}

export default RoomEntryLayout;
