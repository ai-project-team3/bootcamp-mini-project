import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResultPage } from "./ResultPage";
import * as client from "../api/client";
import type { GameResult } from "../api/types";

const result: GameResult = {
  winner: "citizen",
  players: [
    {
      player_id: "p1",
      nickname: "정글짐",
      role: "police",
      is_alive: true,
      assigned_score: 82,
      assigned_by: "preference",
      persona_scores: { DOM: 30, SPD: 60, EXP: 50, EMP: 40, OBS: 90 },
    },
    {
      player_id: "p2",
      nickname: "라이트",
      role: "mafia",
      is_alive: false,
      assigned_score: 60,
      assigned_by: "fallback_random",
      persona_scores: { DOM: 40, SPD: 50, EXP: 50, EMP: 20, OBS: 30 },
    },
  ],
};

describe("ResultPage", () => {
  it("shows a loading state, then the winner, player cards, and superlatives", async () => {
    vi.spyOn(client, "getResult").mockResolvedValue(result);

    render(<ResultPage session={{ roomId: "r1", playerId: "p1", isHost: true }} />);
    expect(screen.getByText("결과를 불러오는 중...")).toBeInTheDocument();

    expect(await screen.findByText("시민 팀 승리!")).toBeInTheDocument();
    expect(screen.getByText("정글짐 - 경찰")).toBeInTheDocument();
    expect(screen.getByText("라이트 - 마피아")).toBeInTheDocument();
    expect(screen.getByText(/관찰력 90/)).toBeInTheDocument();
    expect(screen.getByText(/가장 마피아다웠던 사람/)).toBeInTheDocument();
  });

  it("lets the player go back to the lobby, restarting the same room", async () => {
    vi.spyOn(client, "getResult").mockResolvedValue(result);
    const restartSpy = vi.spyOn(client, "restartRoom").mockResolvedValue({ phase: "WAITING_ROOM" });

    render(<ResultPage session={{ roomId: "r1", playerId: "p1", isHost: true }} />);
    const restartButton = await screen.findByText("로비로 이동");

    fireEvent.click(restartButton);

    await waitFor(() => expect(restartSpy).toHaveBeenCalledWith("r1"));
  });
});
