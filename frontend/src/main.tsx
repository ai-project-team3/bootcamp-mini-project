/**
 * Standalone dev entrypoint.
 *
 * The two games are independent features; nothing here is part of either one.
 * When they are mounted inside CrewVerse, its own entry and router replace this
 * file, and each game is reached through a CrewVerse route instead.
 *
 * Locally, pick a game with the hash: `#/mafia` or `#/marble`.
 */
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { MafiaApp } from "./pages/mafia/MafiaApp";
import { MarbleApp } from "./pages/marble/MarbleApp";
import "./standalone.css";
import "./pages/mafia/styles/global.css";
import "./pages/marble/styles/global.css";

type Game = "mafia" | "marble" | null;

function readGame(): Game {
  const hash = window.location.hash.replace(/^#\/?/, "").toLowerCase();
  if (hash.startsWith("mafia")) return "mafia";
  if (hash.startsWith("marble")) return "marble";
  return null;
}

function GamePicker() {
  return (
    <div className="dev-picker">
      <h1>페르소나 미니게임</h1>
      <p>플레이할 게임을 고르세요.</p>
      <div className="dev-picker-links">
        <a href="#/mafia">🕵️ 마피아 게임</a>
        <a href="#/marble">💞 커플 브루마블</a>
      </div>
    </div>
  );
}

function DevRoot() {
  const [game, setGame] = useState<Game>(readGame);

  useEffect(() => {
    const onHashChange = () => setGame(readGame());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (game === "mafia") return <MafiaApp />;
  if (game === "marble") return <MarbleApp />;
  return <GamePicker />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DevRoot />
  </React.StrictMode>
);
