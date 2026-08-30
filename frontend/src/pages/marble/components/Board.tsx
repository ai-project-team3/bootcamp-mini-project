import type { ReactNode } from "react";
import type { RoomPlayer, Tile as TileModel } from "../api/types";
import { Tile } from "./Tile";

const GRID_POSITIONS: Array<[number, number]> = [
  [1, 1], [1, 2], [1, 3], [1, 4],
  [2, 4], [3, 4],
  [4, 4], [4, 3], [4, 2], [4, 1],
  [3, 1], [2, 1],
];

interface BoardProps {
  board: TileModel[];
  /** Seat order decides which token art each player gets. */
  players: RoomPlayer[];
  /** Rendered into the board's middle 2x2 hub — the dice arena. */
  children?: ReactNode;
  /** Rendered under the grid, for controls too big for the hub. */
  footer?: ReactNode;
  /** Presentational override keyed by player id, used to drive the hop animation. */
  animatedPositions?: Record<string, number>;
  hoppingPlayerId?: string | null;
}

export function Board({ board, players, children, footer, animatedPositions, hoppingPlayerId }: BoardProps) {
  const occupantsByIndex = new Map<number, number[]>();
  players.forEach((player, seat) => {
    const position = animatedPositions?.[player.player_id] ?? player.position;
    occupantsByIndex.set(position, [...(occupantsByIndex.get(position) ?? []), seat]);
  });

  const hoppingSeat = players.findIndex((p) => p.player_id === hoppingPlayerId);

  return (
    <div className="pm-board-wrap">
      <div className="pm-board" role="grid" aria-label="페르소나 마블 보드">
        {board.map((tile) => {
          const [row, col] = GRID_POSITIONS[tile.index];
          return (
            <Tile
              key={tile.index}
              tile={tile}
              occupantSeats={occupantsByIndex.get(tile.index) ?? []}
              playerNames={players.map((p) => p.nickname)}
              hoppingSeat={hoppingSeat >= 0 ? hoppingSeat : null}
              style={{ gridRow: row, gridColumn: col }}
            />
          );
        })}
        <div className="pm-board__center">{children}</div>
      </div>
      {/* Outside the grid: the board is a strict 4x4, so anything under it has
          to sit in a wrapper rather than become a stray grid item. */}
      {footer && <div className="pm-board__footer">{footer}</div>}
    </div>
  );
}
