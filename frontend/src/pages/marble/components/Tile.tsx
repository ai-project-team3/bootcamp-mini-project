import type { Tile as TileModel } from "../api/types";
import tileStart from "../assets/tile-start.png";
import tileLogic from "../assets/tile-logic.png";
import tileEmpathy from "../assets/tile-empathy.png";
import tileDrive from "../assets/tile-drive.png";
import tileCaution from "../assets/tile-caution.png";
import tileChance from "../assets/tile-chance.png";
import { seatArt } from "./seatArt";

const TILE_LABELS: Record<TileModel["type"], string> = {
  START: "출발",
  LOGIC: "분석력",
  EMPATHY: "공감력",
  DRIVE: "추진력",
  CAUTION: "신중함",
  CHANCE: "찬스",
};

const TILE_ART: Record<TileModel["type"], string> = {
  START: tileStart,
  LOGIC: tileLogic,
  EMPATHY: tileEmpathy,
  DRIVE: tileDrive,
  CAUTION: tileCaution,
  CHANCE: tileChance,
};

const TILE_CLASS: Record<TileModel["type"], string> = {
  START: "pm-tile--start",
  LOGIC: "pm-tile--logic",
  EMPATHY: "pm-tile--empathy",
  DRIVE: "pm-tile--drive",
  CAUTION: "pm-tile--caution",
  CHANCE: "pm-tile--chance",
};

/** Token art is assigned by seat, so each player keeps one marble all game. */

interface TileProps {
  tile: TileModel;
  occupantSeats: number[];
  playerNames: string[];
  hoppingSeat?: number | null;
  style?: React.CSSProperties;
}

export function Tile({ tile, occupantSeats, playerNames, hoppingSeat, style }: TileProps) {
  return (
    <div className={`pm-tile ${TILE_CLASS[tile.type]}`} style={style} data-testid={`pm-tile-${tile.index}`}>
      <img className="pm-tile__icon" src={TILE_ART[tile.type]} alt="" aria-hidden="true" />
      <span className="pm-tile__label">{TILE_LABELS[tile.type]}</span>
      {occupantSeats.length > 0 && (
        <span className="pm-tile__occupants">
          {occupantSeats.map((seat) => (
            <img
              key={seat}
              className={`pm-token ${seat === hoppingSeat ? "pm-token--hopping" : ""}`}
              src={seatArt(seat)}
              alt={playerNames[seat] ?? `플레이어 ${seat + 1}`}
            />
          ))}
        </span>
      )}
    </div>
  );
}
