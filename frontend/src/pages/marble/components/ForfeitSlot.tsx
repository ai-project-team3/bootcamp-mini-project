import { useEffect, useRef, useState } from "react";

import "./ForfeitSlot.css";

const SLOT_HEIGHT = 34;
/** Rows visible at once. Three lets the next name creep into view during the
    tease, which is where the tension comes from. */
const VISIBLE_ROWS = 3;

/** How long the reel spins before it settles, in ms. */
const SPIN_MS = 3600;
/** How far past the winner the reel creeps before falling back, in slots. */
const TEASE_SLOTS = 0.42;
/** Fraction of the run spent on the tease-and-settle at the end. */
const TEASE_PHASE = 0.22;

export interface ForfeitSlotProps {
  /** Names on the reel, in seating order. */
  names: string[];
  /** Index in `names` the reel must land on. */
  winnerIndex: number;
  /** Fires once the reel has settled. */
  onSettled?: () => void;
}

/** Decelerating spin: fast at first, crawling by the end. */
function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5);
}

/**
 * Slot-machine draw for "who gets the dare".
 *
 * The tension comes from the last fifth of the run: the reel has visibly
 * stopped on the winner, then creeps most of the way toward the next name as
 * though it will roll over — and sags back. It never actually passes.
 */
export function ForfeitSlot({ names, winnerIndex, onSettled }: ForfeitSlotProps) {
  const [offset, setOffset] = useState(0);
  const [settled, setSettled] = useState(false);
  const frameRef = useRef<number | null>(null);
  const settledRef = useRef(false);

  useEffect(() => {
    if (names.length === 0) return;

    // Enough whole laps that the reel reads as a blur before it slows.
    const laps = 4 + names.length;
    const finalOffset = laps * names.length + winnerIndex;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - start) / SPIN_MS, 1);

      if (t < 1 - TEASE_PHASE) {
        // Main spin, decelerating.
        const p = easeOutQuint(t / (1 - TEASE_PHASE));
        setOffset(finalOffset * p);
      } else {
        // Tease: nudge toward the next name, then sag back onto the winner.
        const p = (t - (1 - TEASE_PHASE)) / TEASE_PHASE;
        // Rise to the peak by the two-thirds mark, then fall back.
        const swell = p < 0.66 ? p / 0.66 : 1 - (p - 0.66) / 0.34;
        setOffset(finalOffset + TEASE_SLOTS * easeOutQuint(swell));
      }

      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }
      setOffset(finalOffset);
      if (!settledRef.current) {
        settledRef.current = true;
        setSettled(true);
        onSettled?.();
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
    // Re-running on a new draw is the point; onSettled is intentionally excluded
    // so an inline callback does not restart the reel every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names.join("\u0000"), winnerIndex]);

  if (names.length === 0) return null;

  // The strip repeats so a reel that has spun many laps still has names under it.
  const strip = Array.from({ length: 12 * Math.max(names.length, 1) }, (_, i) => names[i % names.length]);
  const windowHeight = SLOT_HEIGHT * VISIBLE_ROWS;
  // The reel is centred on the middle row, so back off by one row.
  const translate = -(offset - 1) * SLOT_HEIGHT;

  return (
    <div className={`pm-slot${settled ? " pm-slot--settled" : ""}`} data-testid="forfeit-slot">
      <div className="pm-slot-window" style={{ height: windowHeight }}>
        <div
          className="pm-slot-strip"
          style={{ transform: `translateY(${translate}px)` }}
          aria-hidden={!settled}
        >
          {strip.map((name, i) => (
            <div className="pm-slot-cell" key={i} style={{ height: SLOT_HEIGHT }}>
              {name}
            </div>
          ))}
        </div>
        <div className="pm-slot-mask pm-slot-mask--top" />
        <div className="pm-slot-mask pm-slot-mask--bottom" />
        <div className="pm-slot-marker" aria-hidden="true" />
      </div>
      <p className="pm-slot-caption" role="status">
        {settled ? `${names[winnerIndex]}님 당첨!` : "벌칙 받을 사람 뽑는 중..."}
      </p>
    </div>
  );
}
