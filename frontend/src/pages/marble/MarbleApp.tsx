import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createRoom,
  finishForfeit,
  joinRoom,
  restartRoom,
  rollDice,
  startGame,
  submitAnswer,
  updateMaxPlayers,
} from "./api/client";
import type { ContentMode, RoomPlayer, RoomState } from "./api/types";
import { useMarbleRoom } from "./hooks/useMarbleRoom";
import { useMarbleSession } from "./hooks/useMarbleSession";
import { Board } from "./components/Board";
import { Dice } from "./components/Dice";
import { ScoreDashboard } from "./components/ScoreDashboard";
import { QuizModal } from "./components/QuizModal";
import { GameOverScreen } from "./components/GameOverScreen";
import { LobbyScreen } from "./components/LobbyScreen";
import { WaitingRoom } from "./components/WaitingRoom";
import "./styles/global.css";
import { MIN_PLAYERS } from "./constants";

const HOP_TICK_MS = 220;

type UiStage = "idle" | "moving-forward" | "quiz" | "moving-back" | "feedback";

function readInviteCode(): string {
  try {
    return new URLSearchParams(window.location.search).get("room")?.toUpperCase() ?? "";
  } catch {
    return "";
  }
}

interface MarbleAppProps {
  /** Lets the host shell follow the room's palette (일반=light, 19금=dark). */
  onToneChange?: (tone: "light" | "dark") => void;
}

export function MarbleApp({ onToneChange }: MarbleAppProps = {}) {
  const { session, setSession, clearSession } = useMarbleSession();
  const { state, error: pollError } = useMarbleRoom(session?.roomId ?? null);

  const [contentMode, setContentMode] = useState<ContentMode>("general");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const [uiStage, setUiStage] = useState<UiStage>("idle");
  const [hoppingPlayerId, setHoppingPlayerId] = useState<string | null>(null);
  const [displayPosition, setDisplayPosition] = useState<number | null>(null);

  const moverFromRef = useRef(0);
  const quizTargetRef = useRef(0);
  const handledRef = useRef<string>("");
  const hopIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const inviteCode = useMemo(readInviteCode, []);
  const [maxPlayers, setMaxPlayers] = useState<number>(MIN_PLAYERS);

  const themeMode: "light" | "dark" =
    (state?.content_mode ?? contentMode) === "adult" ? "dark" : "light";

  useEffect(() => {
    onToneChange?.(themeMode);
  }, [themeMode, onToneChange]);

  useEffect(() => {
    return () => {
      if (hopIntervalRef.current) clearInterval(hopIntervalRef.current);
    };
  }, []);

  // A room that vanished (server restart) should not trap the player forever.
  useEffect(() => {
    if (pollError && pollError.includes("404")) {
      clearSession();
      setActionError("이전 방을 찾을 수 없어요. 새로 시작해주세요.");
    }
  }, [pollError, clearSession]);

  const playHop = useCallback(
    (mover: string, start: number, steps: number, direction: 1 | -1, size: number, done: () => void) => {
      setHoppingPlayerId(mover);
      let pos = start;
      setDisplayPosition(pos);
      let count = 0;
      hopIntervalRef.current = setInterval(() => {
        pos = (pos + direction + size) % size;
        setDisplayPosition(pos);
        count += 1;
        if (count >= steps) {
          if (hopIntervalRef.current) clearInterval(hopIntervalRef.current);
          done();
        }
      }, HOP_TICK_MS);
    },
    []
  );

  // Drive the move / quiz / revert animation off server phase transitions.
  useEffect(() => {
    if (!state || !session) return;

    // Only react to a genuinely new server phase, not to every poll tick.
    const signature = `${state.phase}:${state.last_dice_roll}:${state.current_player_id}:${state.last_answer_correct}`;
    if (handledRef.current === signature) return;
    handledRef.current = signature;

    const size = state.board_size || 12;
    const mover = state.current_player_id;

    if (state.phase === "SHOW_QUIZ" && state.quiz && state.last_dice_roll && mover) {
      const from = state.players.find((p) => p.player_id === mover)?.position ?? 0;
      moverFromRef.current = from;
      quizTargetRef.current = (from + state.last_dice_roll) % size;
      setUiStage("moving-forward");
      playHop(mover, from, state.last_dice_roll, 1, size, () => setUiStage("quiz"));
      return;
    }

    if (state.phase === "SUBMIT_ANSWER" && mover) {
      if (state.last_answer_correct === false && state.last_dice_roll) {
        const origin = state.players.find((p) => p.player_id === mover)?.position ?? 0;
        setUiStage("moving-back");
        playHop(mover, quizTargetRef.current, state.last_dice_roll, -1, size, () => {
          setDisplayPosition(origin);
          setHoppingPlayerId(null);
          setUiStage("feedback");
        });
      } else {
        setHoppingPlayerId(null);
        setDisplayPosition(null);
        setUiStage("feedback");
      }
      return;
    }

    setUiStage("idle");
    setHoppingPlayerId(null);
    setDisplayPosition(null);
    setSelectedIndex(null);
  }, [state, session, playHop]);

  const run = useCallback(async (fn: () => Promise<unknown>, fallback: string) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : fallback);
    } finally {
      setBusy(false);
    }
  }, []);

  const handleCreate = useCallback(
    (nickname: string) =>
      run(async () => {
        const { room_id } = await createRoom(contentMode, maxPlayers);
        const joined = await joinRoom(room_id, nickname);
        setSession({ roomId: room_id, playerId: joined.player_id, isHost: joined.is_host });
      }, "방을 만들지 못했어요."),
    [run, contentMode, maxPlayers, setSession]
  );

  const handleJoin = useCallback(
    (roomId: string, nickname: string) =>
      run(async () => {
        const joined = await joinRoom(roomId, nickname);
        setSession({ roomId, playerId: joined.player_id, isHost: joined.is_host });
      }, "방에 참여하지 못했어요."),
    [run, setSession]
  );

  const handleChangeMaxPlayers = useCallback(
    (count: number) => {
      if (!session) return;
      run(() => updateMaxPlayers(session.roomId, count), "인원수를 바꾸지 못했어요.");
    },
    [run, session]
  );

  const handleStart = useCallback(() => {
    if (!session) return;
    return run(() => startGame(session.roomId), "게임을 시작하지 못했어요.");
  }, [run, session]);

  const handleRoll = useCallback(() => {
    if (!session) return;
    return run(() => rollDice(session.roomId, session.playerId), "주사위를 굴리지 못했어요.");
  }, [run, session]);

  const handleAnswer = useCallback(
    (choiceIndex: number) => {
      if (!session) return;
      setSelectedIndex(choiceIndex);
      return run(
        () => submitAnswer(session.roomId, session.playerId, choiceIndex),
        "답변을 보내지 못했어요."
      );
    },
    [run, session]
  );

  const handleForfeitDone = useCallback(() => {
    if (!session) return;
    return run(() => finishForfeit(session.roomId, session.playerId), "진행하지 못했어요.");
  }, [run, session]);

  const handleRestart = useCallback(() => {
    if (!session) return;
    return run(() => restartRoom(session.roomId), "다시 시작하지 못했어요.");
  }, [run, session]);

  const handleLeave = useCallback(() => {
    // TODO: 미니프로젝트의 게임 허브(다른 미니게임 선택 화면)로 이동 — 지금은 로비로 대체
    clearSession();
    setActionError(null);
  }, [clearSession]);

  // Who the dare could land on, and where the reel must stop. The server picks
  // the target; the reel only replays that choice, so a client cannot influence
  // it — and everyone watching sees the same name come up.
  const forfeitCandidates = useMemo(
    () =>
      state?.forfeit_target_id
        ? (state?.players ?? [])
            .filter((p) => p.player_id !== state?.current_player_id)
            .map((p) => p.nickname)
        : [],
    [state?.forfeit_target_id, state?.players, state?.current_player_id],
  );

  const forfeitWinnerIndex = useMemo(() => {
    if (!state?.forfeit_target_id) return null;
    const others = (state?.players ?? []).filter((p) => p.player_id !== state?.current_player_id);
    const index = others.findIndex((p) => p.player_id === state?.forfeit_target_id);
    return index >= 0 ? index : null;
  }, [state?.forfeit_target_id, state?.players, state?.current_player_id]);

  if (!session) {
    return (
      <div className="pm-app" data-pm-theme={themeMode}>
        <div className="pm-shell pm-shell--center">
          <LobbyScreen
            contentMode={contentMode}
            onContentModeChange={setContentMode}
            maxPlayers={maxPlayers}
            onMaxPlayersChange={setMaxPlayers}
            onCreate={handleCreate}
            onJoin={handleJoin}
            initialRoomCode={inviteCode}
            busy={busy}
            error={actionError}
          />
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="pm-app" data-pm-theme={themeMode}>
        <div className="pm-shell">
          <p className="pm-loading">방 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (state.phase === "WAITING") {
    return (
      <div className="pm-app" data-pm-theme={themeMode}>
        <div className="pm-shell pm-shell--center">
          <WaitingRoom
            state={state}
            playerId={session.playerId}
            onStart={handleStart}
            onLeave={handleLeave}
            onChangeMaxPlayers={handleChangeMaxPlayers}
            starting={busy}
            error={actionError}
          />
        </div>
      </div>
    );
  }

  const me = state.players.find((p) => p.player_id === session.playerId);
  const isMyTurn = state.current_player_id === session.playerId;
  const currentPlayer = state.players.find((p) => p.player_id === state.current_player_id);
  const showQuizModal = state.quiz !== null && (uiStage === "quiz" || uiStage === "feedback");


  const animatedPositions =
    hoppingPlayerId && displayPosition !== null ? { [hoppingPlayerId]: displayPosition } : undefined;

  return (
    <div className="pm-app" data-pm-theme={themeMode}>
      <div className="pm-shell">
        <header>
          <p className="pm-eyebrow">Persona Marble</p>
          <h1 className="pm-heading">페르소나 마블</h1>
        </header>

        {state.phase === "GAME_OVER" ? (
          <GameOverScreen
            players={state.players}
            winnerId={state.winner_id}
            myPlayerId={session.playerId}
            chemistrySummary={state.chemistry_summary ?? ""}
            onRestart={handleRestart}
            onExit={handleLeave}
          />
        ) : (
          <>
            <ScoreDashboard
              players={state.players}
              currentPlayerId={state.current_player_id}
              myPlayerId={session.playerId}
              boardSize={state.board_size}
            />
            <div className="pm-card pm-board-card">
              <Board
                board={state.board}
                players={state.players}
                animatedPositions={animatedPositions}
                hoppingPlayerId={hoppingPlayerId}
              >
                <Dice
                  lastRoll={state.last_dice_roll}
                  disabled={!isMyTurn || state.phase !== "ROLL_DICE" || busy}
                  onRoll={handleRoll}
                  eyebrow={me ? `내 진행 ${me.steps_moved} / ${state.board_size}` : undefined}
                  caption={
                    isMyTurn ? "내 차례예요!" : `${currentPlayer?.nickname ?? "상대"}님 차례`
                  }
                />
              </Board>
            </div>
            {actionError && <p className="pm-waiting__error">{actionError}</p>}
          </>
        )}
      </div>

      {showQuizModal && state.quiz && (
        <QuizModal
          quiz={state.quiz}
          answered={uiStage === "feedback"}
          canAnswer={isMyTurn && !busy}
          lastAnswerCorrect={state.last_answer_correct}
          selectedIndex={selectedIndex}
          assignedForfeit={state.assigned_forfeit}
          lastChanceCard={state.last_chance_card}
          forfeitCandidates={forfeitCandidates}
          forfeitWinnerIndex={forfeitWinnerIndex}
          onAnswer={handleAnswer}
          onForfeitComplete={handleForfeitDone}
        />
      )}
    </div>
  );
}
