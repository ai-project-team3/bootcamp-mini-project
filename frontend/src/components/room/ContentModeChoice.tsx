import "./RoomLayout.css";

export type ContentModeValue = "general" | "adult";

interface ContentModeChoiceProps {
  value: ContentModeValue;
  onChange: (mode: ContentModeValue) => void;
  /** Hidden when the surrounding screen already says what is being chosen. */
  label?: string | null;
}

/**
 * 커플 브루마블's 일반 / 19금 choice.
 *
 * It lives here rather than in the game because two screens ask for it: the
 * game's own lobby, for someone who opened 커플 브루마블 directly, and the
 * room's game chooser, for a group that never sees that lobby. One copy means
 * the wording and the look cannot drift apart between the two.
 */
export function ContentModeChoice({ value, onChange, label = "모드" }: ContentModeChoiceProps) {
  return (
    <div className="game-room-option-group">
      {label && <span className="game-room-option-label">{label}</span>}
      <div className="game-room-modes" role="group" aria-label="모드">
        <button
          type="button"
          data-testid="pm-mode-general"
          className="game-room-mode"
          aria-pressed={value === "general"}
          onClick={() => onChange("general")}
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
          aria-pressed={value === "adult"}
          onClick={() => onChange("adult")}
        >
          <span className="game-room-mode-icon" aria-hidden="true">
            🌙
          </span>
          <b>19금 모드</b>
          <small>더 과감한 질문과 벌칙, 벌칙 받을 사람은 추첨</small>
        </button>
      </div>
    </div>
  );
}

export default ContentModeChoice;
