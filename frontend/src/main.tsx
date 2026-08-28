/**
 * Standalone dev entrypoint.
 *
 * The two games are independent features; nothing here belongs to either one.
 * When they are mounted inside CrewVerse, its own entry and router replace this
 * file and CrewVerse owns navigation — which is why the "back" control lives
 * here and not inside a game.
 *
 * Locally, pick a game with the hash: `#/mafia` or `#/marble`.
 */
import React, { useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { MafiaApp } from "./pages/mafia/MafiaApp";
import { MarbleApp } from "./pages/marble/MarbleApp";
import "./standalone.css";
import "./pages/mafia/styles/global.css";
import "./pages/marble/styles/global.css";

type Game = "mafia" | "marble";

const GAMES: { id: Game; label: string; icon: string; blurb: string }[] = [
  { id: "mafia", label: "마피아 게임", icon: "🕵️", blurb: "4~8인 · 성향으로 직업이 정해지는 아이스브레이킹" },
  { id: "marble", label: "커플 브루마블", icon: "💞", blurb: "2인 · 성향 기반 1대1 보드게임" },
];

/** Each game keeps its room in localStorage so a reload does not drop you. */
const SESSION_KEYS: Record<Game, string> = {
  mafia: "mafia_game_session",
  marble: "personaMarble.session",
};

function readGame(): Game | null {
  const hash = window.location.hash.replace(/^#\/?/, "").toLowerCase();
  if (hash.startsWith("mafia")) return "mafia";
  if (hash.startsWith("marble")) return "marble";
  return null;
}

function hasSavedRoom(game: Game): boolean {
  try {
    return window.localStorage.getItem(SESSION_KEYS[game]) !== null;
  } catch {
    return false;
  }
}

function goToPicker() {
  window.location.hash = "";
}

function GamePicker({ onLeave }: { onLeave: (game: Game) => void }) {
  return (
    <div className="dev-picker">
      <h1>페르소나 미니게임</h1>
      <p>플레이할 게임을 고르세요.</p>
      <div className="dev-picker-links">
        {GAMES.map((game) => (
          <div key={game.id} className="dev-picker-item">
            <a href={`#/${game.id}`}>
              <span className="dev-picker-icon">{game.icon}</span>
              <span className="dev-picker-label">{game.label}</span>
              <span className="dev-picker-blurb">{game.blurb}</span>
            </a>
            {hasSavedRoom(game.id) && (
              <button type="button" className="dev-picker-leave" onClick={() => onLeave(game.id)}>
                진행 중인 방 나가기
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DevRoot() {
  const [game, setGame] = useState<Game | null>(readGame);
  // Bumped when a saved room is dropped, so the picker re-reads localStorage.
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const onHashChange = () => setGame(readGame());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const handleLeave = useCallback((which: Game) => {
    try {
      window.localStorage.removeItem(SESSION_KEYS[which]);
    } catch {
      // Non-fatal: the room just stays remembered.
    }
    setRevision((n) => n + 1);
  }, []);

  if (game === null) return <GamePicker key={revision} onLeave={handleLeave} />;

  return (
    <>
      <button type="button" className="dev-back" onClick={goToPicker}>
        ← 게임 선택
      </button>
      {game === "mafia" ? <MafiaApp /> : <MarbleApp />}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DevRoot />
  </React.StrictMode>
);
