import tokenA from "../assets/token-a.png";
import tokenB from "../assets/token-b.png";
import tokenC from "../assets/token-c.png";
import tokenD from "../assets/token-d.png";
import tokenE from "../assets/token-e.png";
import tokenF from "../assets/token-f.png";
import tokenG from "../assets/token-g.png";
import tokenH from "../assets/token-h.png";

/**
 * One token per seat, in seating order.
 *
 * There is art for every seat a room can hold, so no screen ever has to index
 * past the end of this list. `seatArt()` wraps anyway, because an out-of-range
 * seat should show the wrong colour rather than a broken image.
 */
export const SEAT_ART: readonly string[] = [
  tokenA,
  tokenB,
  tokenC,
  tokenD,
  tokenE,
  tokenF,
  tokenG,
  tokenH,
];

export function seatArt(seat: number): string {
  const index = ((seat % SEAT_ART.length) + SEAT_ART.length) % SEAT_ART.length;
  return SEAT_ART[index];
}
