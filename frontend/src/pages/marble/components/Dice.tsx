import { useEffect, useRef, useState } from "react";
import diceBlank from "../assets/dice-blank.png";

interface DiceProps {
  lastRoll: number | null;
  disabled: boolean;
  onRoll: () => void;
  /** Shown under the board so the table always knows whose move it is. */
  caption?: string;
  /** Small overline above the die, e.g. the turn counter. */
  eyebrow?: string;
}

const ROLL_DURATION_MS = 900;
const ROLL_TICK_MS = 90;

/** Which of the 9 grid cells carry a pip, per face value. */
const PIP_LAYOUT: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
};

export function useDiceRoll({ lastRoll, disabled, onRoll }: Omit<DiceProps, "caption" | "eyebrow">) {
  const [isRolling, setIsRolling] = useState(false);
  const [displayValue, setDisplayValue] = useState<number | null>(null);
  const timers = useRef<{ interval: ReturnType<typeof setInterval> | null; timeout: ReturnType<typeof setTimeout> | null }>({
    interval: null,
    timeout: null,
  });

  useEffect(() => {
    return () => {
      if (timers.current.interval) clearInterval(timers.current.interval);
      if (timers.current.timeout) clearTimeout(timers.current.timeout);
    };
  }, []);

  const handleClick = () => {
    if (disabled || isRolling) return;
    setIsRolling(true);
    timers.current.interval = setInterval(() => {
      setDisplayValue(Math.floor(Math.random() * 3) + 1);
    }, ROLL_TICK_MS);
    timers.current.timeout = setTimeout(() => {
      if (timers.current.interval) clearInterval(timers.current.interval);
      setIsRolling(false);
      onRoll();
    }, ROLL_DURATION_MS);
  };

  // The face and the badge read from the same value, so they can never disagree.
  const shown = isRolling ? displayValue : lastRoll;
  const pips = shown !== null ? (PIP_LAYOUT[shown] ?? []) : [];

  return { isRolling, shown, pips, roll: handleClick };
}

export interface DiceStageProps {
  isRolling: boolean;
  shown: number | null;
  pips: number[];
  /** Small overline above the die, e.g. the turn counter. */
  eyebrow?: string;
}

/** The die itself. Sits in the board's 2x2 hub, which is all that fits there. */
export function DiceStage({ isRolling, shown, pips, eyebrow }: DiceStageProps) {
  return (
    <div className="pm-dice-arena">
      {eyebrow && <p className="pm-eyebrow pm-dice__eyebrow">{eyebrow}</p>}

      {/* The badge lives outside the tumbling element so it stays upright. */}
      <div className="pm-dice-stage">
        <div className={`pm-dice ${isRolling ? "pm-dice--rolling" : ""}`} data-testid="pm-dice">
          <img className="pm-dice__art" src={diceBlank} alt="" aria-hidden="true" />
          <span className="pm-dice__face" aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className={`pm-dice__pip ${pips.includes(i) ? "pm-dice__pip--on" : ""}`} />
            ))}
          </span>
        </div>
        {shown !== null && (
          <span className="pm-dice__badge" data-testid="pm-dice-badge" aria-hidden="true">
            {shown}
          </span>
        )}
      </div>

      <span className="pm-sr-only" aria-live="polite">
        {shown !== null ? `주사위 ${shown}` : "주사위 대기 중"}
      </span>
    </div>
  );
}

export interface DiceControlsProps {
  isRolling: boolean;
  disabled: boolean;
  onRoll: () => void;
  /** Shown under the board so the table always knows whose move it is. */
  caption?: string;
}

/**
 * The roll button and the turn caption.
 *
 * They render under the board, not in the hub: the hub is only about half the
 * board wide, and the button and caption used to spill out of it onto the
 * surrounding tiles.
 */
export function DiceControls({ isRolling, disabled, onRoll, caption }: DiceControlsProps) {
  return (
    <div className="pm-dice-controls">
      <button
        type="button"
        className="pm-button pm-button--primary pm-dice__button"
        onClick={onRoll}
        disabled={disabled || isRolling}
      >
        {isRolling ? "굴리는 중..." : "주사위 굴리기"}
      </button>
      {caption && <p className="pm-dice__caption">{caption}</p>}
    </div>
  );
}

/** Both halves together — used where the layout does not split them. */
export function Dice({ lastRoll, disabled, onRoll, caption, eyebrow }: DiceProps) {
  const { isRolling, shown, pips, roll } = useDiceRoll({ lastRoll, disabled, onRoll });
  return (
    <>
      <DiceStage isRolling={isRolling} shown={shown} pips={pips} eyebrow={eyebrow} />
      <DiceControls isRolling={isRolling} disabled={disabled} onRoll={roll} caption={caption} />
    </>
  );
}
