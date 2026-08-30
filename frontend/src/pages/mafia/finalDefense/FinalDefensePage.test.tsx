import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FinalDefensePage } from "./FinalDefensePage";
import * as client from "../api/client";
import type { RoomState } from "../api/types";

const state: RoomState = {
  phase: "FINAL_DEFENSE",
  day_number: 1,
  night_number: 0,
  host_player_id: "p1",
  player_count: 3,
  personas_ready: true,
  phase_deadline: null,
  accused_player_id: "p2",
  night_summary: null,
  execution_result: null,
  players: [
    { player_id: "p1", nickname: "정글짐", is_alive: true },
    { player_id: "p2", nickname: "라이트", is_alive: true },
  ],
};

describe("FinalDefensePage", () => {
  it("shows the accused player's nickname in the defense prompt", () => {
    render(<FinalDefensePage session={{ roomId: "r1", playerId: "p1", isHost: false }} state={state} />);
    expect(screen.getByText("라이트님의 최후 변론 시간입니다")).toBeInTheDocument();
  });

  it("lets the host skip ahead, calling advancePhase", async () => {
    const spy = vi.spyOn(client, "advancePhase").mockResolvedValue({ phase: "EXECUTION_VOTE" });
    render(<FinalDefensePage session={{ roomId: "r1", playerId: "p1", isHost: true }} state={state} />);

    fireEvent.click(screen.getByText("건너뛰기 (관리자)"));

    await waitFor(() => expect(spy).toHaveBeenCalledWith("r1"));
  });

  it("does not show the skip button for a non-host", () => {
    render(<FinalDefensePage session={{ roomId: "r1", playerId: "p1", isHost: false }} state={state} />);
    expect(screen.queryByText("건너뛰기 (관리자)")).not.toBeInTheDocument();
  });

  it("shows the final defense scene image", () => {
    render(<FinalDefensePage session={{ roomId: "r1", playerId: "p1", isHost: false }} state={state} />);
    expect(screen.getByAltText("최후 변론 삽화")).toBeInTheDocument();
  });
});
