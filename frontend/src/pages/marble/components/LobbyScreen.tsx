import { useState } from "react";
import type { ContentMode } from "../api/types";
import tokenA from "../assets/token-a.png";
import tokenB from "../assets/token-b.png";
import { PLAYER_COUNT_OPTIONS } from "../constants";

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
  // Someone arriving on an invite link wants the join tab, not the create tab.
  const [tab, setTab] = useState<"create" | "join">(initialRoomCode ? "join" : "create");
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState(initialRoomCode);

  const trimmedNickname = nickname.trim();
  const trimmedCode = roomCode.trim().toUpperCase();
  const canCreate = trimmedNickname.length > 0 && !busy;
  const canJoin = canCreate && trimmedCode.length > 0;

  return (
    <div className="pm-card pm-start">
      <div className="pm-start__hero" aria-hidden="true">
        <img src={tokenA} alt="" className="pm-start__token pm-start__token--a" />
        <img src={tokenB} alt="" className="pm-start__token pm-start__token--b" />
      </div>
      <p className="pm-eyebrow">Persona Marble</p>
      <h1 className="pm-heading pm-start__title">페르소나 마블</h1>
      <p className="pm-start__lead">
        두 사람의 성향 데이터로 만들어지는 1대1 보드게임이에요.
        <br />
        먼저 한 바퀴를 완주하면 승리합니다.
      </p>

      <div className="pm-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "create"}
          className={`pm-tab ${tab === "create" ? "pm-tab--active" : ""}`}
          onClick={() => setTab("create")}
        >
          방 만들기
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "join"}
          className={`pm-tab ${tab === "join" ? "pm-tab--active" : ""}`}
          onClick={() => setTab("join")}
        >
          방 참여하기
        </button>
      </div>

      {tab === "create" && (
        <div className="pm-mode-options">
          <button
            type="button"
            data-testid="pm-mode-general"
            className={`pm-mode-option ${contentMode === "general" ? "pm-mode-option--selected" : ""}`}
            onClick={() => onContentModeChange("general")}
          >
            <span className="pm-mode-option__icon" aria-hidden="true">
              🌤️
            </span>
            <span className="pm-mode-option__title">일반 모드</span>
            <span className="pm-mode-option__desc">귀엽고 유쾌한 질문과 벌칙</span>
          </button>
          <button
            type="button"
            data-testid="pm-mode-adult"
            className={`pm-mode-option ${contentMode === "adult" ? "pm-mode-option--selected" : ""}`}
            onClick={() => onContentModeChange("adult")}
          >
            <span className="pm-mode-option__icon" aria-hidden="true">
              🌙
            </span>
            <span className="pm-mode-option__title">19금 모드</span>
            <span className="pm-mode-option__desc">더 과감한 질문과 벌칙, 벌칙 받을 사람은 추첨</span>
          </button>
        </div>
      )}

      {tab === "create" && (
        <div className="pm-seat-picker">
          <span className="pm-seat-picker__label">참여 인원</span>
          <div className="pm-seat-picker__options" role="group" aria-label="참여 인원">
            {PLAYER_COUNT_OPTIONS.map((count) => (
              <button
                key={count}
                type="button"
                className={`pm-seat ${maxPlayers === count ? "pm-seat--selected" : ""}`}
                aria-pressed={maxPlayers === count}
                onClick={() => onMaxPlayersChange(count)}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "join" && (
        <label className="pm-field">
          <span className="pm-field__label">방 코드</span>
          <input
            className="pm-input pm-input--code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder="ABC123"
            maxLength={6}
            aria-label="방 코드"
          />
        </label>
      )}

      <label className="pm-field">
        <span className="pm-field__label">닉네임</span>
        <input
          className="pm-input"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="이름을 입력하세요"
          maxLength={12}
          aria-label="닉네임"
        />
      </label>

      {error && <p className="pm-waiting__error">{error}</p>}

      {tab === "create" ? (
        <button
          type="button"
          className="pm-button pm-button--primary pm-start__cta"
          onClick={() => onCreate(trimmedNickname)}
          disabled={!canCreate}
        >
          {busy ? "만드는 중..." : "방 만들기"}
        </button>
      ) : (
        <button
          type="button"
          className="pm-button pm-button--primary pm-start__cta"
          onClick={() => onJoin(trimmedCode, trimmedNickname)}
          disabled={!canJoin}
        >
          {busy ? "참여하는 중..." : "방 참여하기"}
        </button>
      )}
    </div>
  );
}
