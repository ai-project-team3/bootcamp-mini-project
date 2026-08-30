import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RoleRevealPage } from "./RoleRevealPage";
import * as client from "../api/client";
import type { MyView, RoomState } from "../api/types";

const state: RoomState = {
  phase: "ROLE_ASSIGNMENT",
  day_number: 0,
  night_number: 0,
  host_player_id: "p1",
  player_count: 3,
  personas_ready: true,
  phase_deadline: null,
  accused_player_id: null,
  night_summary: null,
  execution_result: null,
  players: [],
};

function myView(overrides: Partial<MyView>): MyView {
  return {
    player_id: "p1",
    nickname: "정글짐",
    is_alive: true,
    role: "police",
    assigned_score: 82,
    assigned_by: "preference",
    investigation_result: null,
    ...overrides,
  };
}

describe("RoleRevealPage", () => {
  it("shows the player's own role", () => {
    render(
      <RoleRevealPage
        session={{ roomId: "r1", playerId: "p1", isHost: false }}
        state={state}
        myView={myView({ role: "doctor" })}
      />
    );
    expect(screen.getByTestId("role-label")).toHaveTextContent("의사");
  });

  it("shows fallback narrative language when assigned_by is fallback_random", () => {
    render(
      <RoleRevealPage
        session={{ roomId: "r1", playerId: "p1", isHost: false }}
        state={state}
        myView={myView({ assigned_by: "fallback_random" })}
      />
    );
    expect(screen.getByText("운명이 이 역할을 선택했습니다.")).toBeInTheDocument();
  });

  it("shows a countdown instead of a manual advance button", () => {
    render(
      <RoleRevealPage
        session={{ roomId: "r1", playerId: "p1", isHost: true }}
        state={state}
        myView={myView({})}
      />
    );
    expect(screen.queryByText("모두 확인했다면 다음 단계로")).not.toBeInTheDocument();
    expect(screen.getByText(/잠시 후 낮이 시작됩니다/)).toBeInTheDocument();
  });

  it("lets the host skip ahead, calling advancePhase", async () => {
    const spy = vi.spyOn(client, "advancePhase").mockResolvedValue({ phase: "DAY_DISCUSSION" });
    render(
      <RoleRevealPage session={{ roomId: "r1", playerId: "p1", isHost: true }} state={state} myView={myView({})} />
    );

    fireEvent.click(screen.getByText("건너뛰기 (관리자)"));

    await waitFor(() => expect(spy).toHaveBeenCalledWith("r1"));
  });

  it("does not show the skip button for a non-host", () => {
    render(
      <RoleRevealPage session={{ roomId: "r1", playerId: "p1", isHost: false }} state={state} myView={myView({})} />
    );
    expect(screen.queryByText("건너뛰기 (관리자)")).not.toBeInTheDocument();
  });

  it("shows the matching role portrait image", () => {
    render(
      <RoleRevealPage
        session={{ roomId: "r1", playerId: "p1", isHost: false }}
        state={state}
        myView={myView({ role: "mafia" })}
      />
    );
    expect(screen.getByAltText("마피아 역할 이미지")).toBeInTheDocument();
  });
});
