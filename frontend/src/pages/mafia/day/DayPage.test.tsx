import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DayPage } from "./DayPage";
import * as client from "../api/client";
import type { MyView, RoomState } from "../api/types";

const players = [
  { player_id: "p1", nickname: "정글짐", is_alive: true },
  { player_id: "p2", nickname: "라이트", is_alive: true },
  { player_id: "p3", nickname: "죽음", is_alive: false },
];

describe("DayPage", () => {
  it("shows a countdown during discussion and no vote controls", () => {
    const state: RoomState = {
      phase: "DAY_DISCUSSION",
      day_number: 1,
      night_number: 0,
      host_player_id: "p1",
      player_count: 3,
      personas_ready: true,
      phase_deadline: null,
      accused_player_id: null,
      night_summary: null,
      execution_result: null,
      players,
    };
    render(<DayPage session={{ roomId: "r1", playerId: "p1", isHost: true }} state={state} />);

    expect(screen.getByText("토론 시간")).toBeInTheDocument();
    expect(screen.queryByText("투표 완료")).not.toBeInTheDocument();
  });

  it("lists only alive players as vote targets, highlights the selection, and requires confirm to cast the vote", async () => {
    const spy = vi.spyOn(client, "castVote").mockResolvedValue({ status: "ok" });
    const state: RoomState = {
      phase: "DAY_VOTE",
      day_number: 1,
      night_number: 0,
      host_player_id: "p1",
      player_count: 3,
      personas_ready: true,
      phase_deadline: null,
      accused_player_id: null,
      night_summary: null,
      execution_result: null,
      players,
    };
    render(<DayPage session={{ roomId: "r1", playerId: "p2", isHost: false }} state={state} />);

    expect(screen.queryByText("죽음")).not.toBeInTheDocument();
    const confirmButton = screen.getByText("투표 완료");
    expect(confirmButton).toBeDisabled();

    fireEvent.click(screen.getAllByText("지목하기")[0]);
    expect(confirmButton).not.toBeDisabled();
    expect(spy).not.toHaveBeenCalled();

    fireEvent.click(confirmButton);

    await waitFor(() => expect(spy).toHaveBeenCalledWith("r1", "p2", "p1"));
    expect(await screen.findByText("투표를 완료했습니다. 다른 사람을 기다리는 중...")).toBeInTheDocument();
  });

  it("lets the host skip ahead during discussion, calling advancePhase", async () => {
    const spy = vi.spyOn(client, "advancePhase").mockResolvedValue({ phase: "DAY_VOTE" });
    const state: RoomState = {
      phase: "DAY_DISCUSSION",
      day_number: 1,
      night_number: 0,
      host_player_id: "p1",
      player_count: 3,
      personas_ready: true,
      phase_deadline: null,
      accused_player_id: null,
      night_summary: null,
      execution_result: null,
      players,
    };
    render(<DayPage session={{ roomId: "r1", playerId: "p1", isHost: true }} state={state} />);

    fireEvent.click(screen.getByText("건너뛰기 (관리자)"));

    await waitFor(() => expect(spy).toHaveBeenCalledWith("r1"));
  });

  it("lets the host skip ahead during voting, and hides the skip button for a non-host", async () => {
    const spy = vi.spyOn(client, "advancePhase").mockResolvedValue({ phase: "FINAL_DEFENSE" });
    const state: RoomState = {
      phase: "DAY_VOTE",
      day_number: 1,
      night_number: 0,
      host_player_id: "p1",
      player_count: 3,
      personas_ready: true,
      phase_deadline: null,
      accused_player_id: null,
      night_summary: null,
      execution_result: null,
      players,
    };
    const { rerender } = render(
      <DayPage session={{ roomId: "r1", playerId: "p2", isHost: false }} state={state} />
    );
    expect(screen.queryByText("건너뛰기 (관리자)")).not.toBeInTheDocument();

    rerender(<DayPage session={{ roomId: "r1", playerId: "p1", isHost: true }} state={state} />);
    fireEvent.click(screen.getByText("건너뛰기 (관리자)"));

    await waitFor(() => expect(spy).toHaveBeenCalledWith("r1"));
  });

  it("shows the discussion scene image during discussion and the vote scene image during voting", () => {
    const discussionState: RoomState = {
      phase: "DAY_DISCUSSION",
      day_number: 1,
      night_number: 0,
      host_player_id: "p1",
      player_count: 3,
      personas_ready: true,
      phase_deadline: null,
      accused_player_id: null,
      night_summary: null,
      execution_result: null,
      players,
    };
    const { rerender } = render(
      <DayPage session={{ roomId: "r1", playerId: "p1", isHost: true }} state={discussionState} />
    );
    expect(screen.getByAltText("토론 시간 삽화")).toBeInTheDocument();

    rerender(
      <DayPage
        session={{ roomId: "r1", playerId: "p1", isHost: true }}
        state={{ ...discussionState, phase: "DAY_VOTE" }}
      />
    );
    expect(screen.getByAltText("투표 시간 삽화")).toBeInTheDocument();
  });

  it("shows the morning recap panel when night_summary reports someone died", () => {
    const state: RoomState = {
      phase: "DAY_DISCUSSION",
      day_number: 2,
      night_number: 1,
      host_player_id: "p1",
      player_count: 3,
      personas_ready: true,
      phase_deadline: null,
      accused_player_id: null,
      night_summary: { attacked_nickname: "라이트", died: true },
      execution_result: null,
      players,
    };
    render(<DayPage session={{ roomId: "r1", playerId: "p1", isHost: true }} state={state} />);
    expect(screen.getByText("라이트님이 사망했습니다.")).toBeInTheDocument();
  });

  it("shows the morning recap panel when the doctor saved the attacked player", () => {
    const state: RoomState = {
      phase: "DAY_DISCUSSION",
      day_number: 2,
      night_number: 1,
      host_player_id: "p1",
      player_count: 3,
      personas_ready: true,
      phase_deadline: null,
      accused_player_id: null,
      night_summary: { attacked_nickname: "라이트", died: false },
      execution_result: null,
      players,
    };
    render(<DayPage session={{ roomId: "r1", playerId: "p1", isHost: true }} state={state} />);
    expect(screen.getByText("라이트님이 마피아의 습격을 받았지만 의사가 살렸습니다!")).toBeInTheDocument();
  });

  it("shows the morning recap panel when nobody was attacked", () => {
    const state: RoomState = {
      phase: "DAY_DISCUSSION",
      day_number: 2,
      night_number: 1,
      host_player_id: "p1",
      player_count: 3,
      personas_ready: true,
      phase_deadline: null,
      accused_player_id: null,
      night_summary: { attacked_nickname: null, died: false },
      execution_result: null,
      players,
    };
    render(<DayPage session={{ roomId: "r1", playerId: "p1", isHost: true }} state={state} />);
    expect(screen.getByText("지난밤 아무 일도 일어나지 않았습니다.")).toBeInTheDocument();
  });

  it("shows the knife effect and shakes the card when the morning recap reports a death", () => {
    const state: RoomState = {
      phase: "DAY_DISCUSSION",
      day_number: 2,
      night_number: 1,
      host_player_id: "p1",
      player_count: 3,
      personas_ready: true,
      phase_deadline: null,
      accused_player_id: null,
      night_summary: { attacked_nickname: "라이트", died: true },
      execution_result: null,
      players,
    };
    const { container } = render(
      <DayPage session={{ roomId: "r1", playerId: "p1", isHost: true }} state={state} />
    );
    expect(container.querySelector(".night-effect-overlay--knife")).not.toBeNull();
    expect(container.querySelector(".card")).toHaveClass("screen-shake");
  });

  it("shows the angel effect (without shaking) when the doctor saved the attacked player", () => {
    const state: RoomState = {
      phase: "DAY_DISCUSSION",
      day_number: 2,
      night_number: 1,
      host_player_id: "p1",
      player_count: 3,
      personas_ready: true,
      phase_deadline: null,
      accused_player_id: null,
      night_summary: { attacked_nickname: "라이트", died: false },
      execution_result: null,
      players,
    };
    const { container } = render(
      <DayPage session={{ roomId: "r1", playerId: "p1", isHost: true }} state={state} />
    );
    expect(container.querySelector(".night-effect-overlay--angel")).not.toBeNull();
    expect(container.querySelector(".card")).not.toHaveClass("screen-shake");
  });

  it("shows no night effect overlay when nobody was attacked", () => {
    const state: RoomState = {
      phase: "DAY_DISCUSSION",
      day_number: 2,
      night_number: 1,
      host_player_id: "p1",
      player_count: 3,
      personas_ready: true,
      phase_deadline: null,
      accused_player_id: null,
      night_summary: { attacked_nickname: null, died: false },
      execution_result: null,
      players,
    };
    const { container } = render(
      <DayPage session={{ roomId: "r1", playerId: "p1", isHost: true }} state={state} />
    );
    expect(container.querySelector(".night-effect-overlay")).toBeNull();
  });

  it("does not show a morning recap panel on the very first day", () => {
    const state: RoomState = {
      phase: "DAY_DISCUSSION",
      day_number: 1,
      night_number: 0,
      host_player_id: "p1",
      player_count: 3,
      personas_ready: true,
      phase_deadline: null,
      accused_player_id: null,
      night_summary: null,
      execution_result: null,
      players,
    };
    render(<DayPage session={{ roomId: "r1", playerId: "p1", isHost: true }} state={state} />);
    expect(screen.queryByText(/사망했습니다|습격을 받았지만|아무 일도 일어나지 않았습니다/)).not.toBeInTheDocument();
  });

  it("shows the police's investigation result on the morning discussion screen as a fallback, even if NightPage never got to reveal it", () => {
    const state: RoomState = {
      phase: "DAY_DISCUSSION",
      day_number: 2,
      night_number: 1,
      host_player_id: "p1",
      player_count: 3,
      personas_ready: true,
      phase_deadline: null,
      accused_player_id: null,
      night_summary: { attacked_nickname: null, died: false },
      execution_result: null,
      players,
    };
    const myView: MyView = {
      player_id: "p1",
      nickname: "정글짐",
      is_alive: true,
      role: "police",
      assigned_score: 80,
      assigned_by: "preference",
      investigation_result: { police_id: "p1", target_id: "p2", is_mafia: true },
    };
    render(
      <DayPage session={{ roomId: "r1", playerId: "p1", isHost: true }} state={state} myView={myView} />
    );
    expect(screen.getByText(/지난 밤 조사 결과: 마피아입니다!/)).toBeInTheDocument();
  });

  it("does not show an investigation result panel for a non-police role", () => {
    const state: RoomState = {
      phase: "DAY_DISCUSSION",
      day_number: 2,
      night_number: 1,
      host_player_id: "p1",
      player_count: 3,
      personas_ready: true,
      phase_deadline: null,
      accused_player_id: null,
      night_summary: { attacked_nickname: null, died: false },
      execution_result: null,
      players,
    };
    const myView: MyView = {
      player_id: "p1",
      nickname: "정글짐",
      is_alive: true,
      role: "citizen",
      assigned_score: 80,
      assigned_by: "preference",
      investigation_result: null,
    };
    render(
      <DayPage session={{ roomId: "r1", playerId: "p1", isHost: true }} state={state} myView={myView} />
    );
    expect(screen.queryByText(/지난 밤 조사 결과/)).not.toBeInTheDocument();
  });
});
