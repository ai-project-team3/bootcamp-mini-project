import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExecutionVotePage } from "./ExecutionVotePage";
import * as client from "../api/client";
import type { RoomState } from "../api/types";

const state: RoomState = {
  phase: "EXECUTION_VOTE",
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
    { player_id: "p3", nickname: "보리", is_alive: true },
  ],
};

describe("ExecutionVotePage", () => {
  it("blocks the accused player from voting on themself", () => {
    render(<ExecutionVotePage session={{ roomId: "r1", playerId: "p2", isHost: false }} state={state} />);
    expect(screen.getByText("당신은 이번 투표에 참여할 수 없습니다.")).toBeInTheDocument();
    expect(screen.queryByText("찬성 (처형)")).not.toBeInTheDocument();
  });

  it("lets another alive player pick a verdict and confirm it", async () => {
    const spy = vi.spyOn(client, "submitExecutionVote").mockResolvedValue({ status: "ok" });
    render(<ExecutionVotePage session={{ roomId: "r1", playerId: "p3", isHost: false }} state={state} />);

    const confirmButton = screen.getByText("투표 완료");
    expect(confirmButton).toBeDisabled();

    fireEvent.click(screen.getByText("찬성 (처형)"));
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);

    await waitFor(() => expect(spy).toHaveBeenCalledWith("r1", "p3", "guilty"));
    expect(await screen.findByText("투표를 완료했습니다. 다른 사람을 기다리는 중...")).toBeInTheDocument();
  });

  it("lets the host skip ahead, calling advancePhase", async () => {
    const spy = vi.spyOn(client, "advancePhase").mockResolvedValue({ phase: "NIGHT_ACTION" });
    render(<ExecutionVotePage session={{ roomId: "r1", playerId: "p1", isHost: true }} state={state} />);

    fireEvent.click(screen.getByText("건너뛰기 (관리자)"));

    await waitFor(() => expect(spy).toHaveBeenCalledWith("r1"));
  });

  it("does not show the skip button for a non-host", () => {
    render(<ExecutionVotePage session={{ roomId: "r1", playerId: "p3", isHost: false }} state={state} />);
    expect(screen.queryByText("건너뛰기 (관리자)")).not.toBeInTheDocument();
  });
});
