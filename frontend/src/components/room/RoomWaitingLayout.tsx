import { useState, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import Card from "../common/Card";
import GameDemoRoomHero from "../common/GameDemoRoomHero";
import { copyText } from "../../shared/clipboard";
import "./RoomLayout.css";

export interface WaitingRoomPlayer {
  id: string;
  nickname: string;
  isHost?: boolean;
  isMe?: boolean;
}

export interface RoomWaitingLayoutProps {
  eyebrow?: string;
  title: ReactNode;
  lead: ReactNode;
  tone?: "light" | "dark";

  /** The invite code players read to each other. */
  code: string;
  /** Full address behind the QR code. */
  inviteUrl: string;

  players: WaitingRoomPlayer[];
  /** Chairs still waiting for someone, drawn after the players. */
  emptySeats?: number;
  /**
   * Art for the seat at this position, filled or not. 브루마블 gives each seat
   * its own token so players can find their piece; the other games fall back
   * to the plain marker.
   */
  seatAvatar?: (seatIndex: number) => ReactNode;

  /** Host-only room settings — 인원수 변경 and the like. */
  options?: ReactNode;
  /** Short status lines, e.g. 성향 데이터 준비 상태. */
  notes?: ReactNode;
  /** Extra host buttons that are not the main call to action. */
  hostTools?: ReactNode;
  error?: string | null;
  /** The 게임 시작 button, or the "waiting for the host" line. */
  footer: ReactNode;
}

/**
 * The one waiting room every game in the app uses: invite code and QR, who has
 * arrived, and the host's start button. Games hang their own controls in
 * `options`/`hostTools` rather than drawing their own room.
 */
export function RoomWaitingLayout({
  eyebrow = "WAITING ROOM",
  title,
  lead,
  tone = "light",
  code,
  inviteUrl,
  players,
  emptySeats = 0,
  seatAvatar,
  options,
  notes,
  hostTools,
  error,
  footer,
}: RoomWaitingLayoutProps) {
  const [copied, setCopied] = useState<boolean | null>(null);

  // Over the LAN the page is not a secure context, so navigator.clipboard is
  // missing; copyText falls back and reports whether it actually worked.
  const handleCopyInvite = async () => {
    const ok = await copyText(inviteUrl);
    setCopied(ok);
    window.setTimeout(() => setCopied(null), 2600);
  };

  return (
    <div className={`game-room-shell${tone === "dark" ? " game-room-shell--dark" : ""}`}>
      <GameDemoRoomHero eyebrow={eyebrow} title={title} compact>
        {lead}
      </GameDemoRoomHero>

      <Card className="game-room-invite-card">
        <QRCodeSVG value={inviteUrl} size={120} bgColor="transparent" fgColor="var(--ink)" />
        <div>
          <small>초대코드</small>
          <strong>{code}</strong>
          <button type="button" onClick={handleCopyInvite}>
            {copied === true
              ? "복사됐어요!"
              : copied === false
                ? "복사 실패 — 아래 주소를 길게 눌러 복사하세요"
                : "초대 링크 복사"}
          </button>
          <small className="game-room-invite-url">{inviteUrl}</small>
        </div>
      </Card>

      {options && <div className="game-room-options">{options}</div>}

      <section className="game-room-player-section">
        <div className="game-room-player-heading">
          <h2>참가자</h2>
          {emptySeats > 0 && (
            <span className="game-room-tally">{emptySeats}자리 남음</span>
          )}
        </div>
        <ul className="game-room-player-list">
          {players.map((player, seat) => (
            <li key={player.id} data-testid={`game-room-seat-${seat}`}>
              {seatAvatar ? seatAvatar(seat) : <span aria-hidden>👤</span>}
              <b>{player.nickname}</b>
              {player.isHost && <em>방장</em>}
              {player.isMe && <small>나</small>}
            </li>
          ))}
          {Array.from({ length: emptySeats }, (_, index) => {
            const seat = players.length + index;
            return (
              <li key={`empty-${seat}`} className="game-room-seat-empty" data-testid={`game-room-seat-${seat}`}>
                {seatAvatar ? seatAvatar(seat) : <span aria-hidden>🪑</span>}
                <b>비어 있음</b>
              </li>
            );
          })}
        </ul>
      </section>

      {notes && <div className="game-room-notes">{notes}</div>}
      {hostTools && <div className="game-room-host-tools">{hostTools}</div>}

      {error && (
        <p className="game-room-error" role="alert">
          {error}
        </p>
      )}

      {footer}
    </div>
  );
}

export default RoomWaitingLayout;
