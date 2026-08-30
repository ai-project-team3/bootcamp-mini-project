import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NightPage } from "./NightPage";
import * as client from "../api/client";
import type { MyView, RoomState } from "../api/types";

const state: RoomState = {
  phase: "NIGHT_ACTION",
  day_number: 1,
  night_number: 1,
  host_player_id: "p1",
  player_count: 3,
  personas_ready: true,
  phase_deadline: null,
  accused_player_id: null,
  night_summary: null,
  execution_result: null,
  players: [
    { player_id: "p1", nickname: "마피아유저", is_alive: true },
    { player_id: "p2", nickname: "다른사람", is_alive: true },
    { player_id: "p3", nickname: "또다른사람", is_alive: true },
  ],
};

function myView(overrides: Partial<MyView>): MyView {
  return {
    player_id: "p1",
    nickname: "마피아유저",
    is_alive: true,
    role: "mafia",
    assigned_score: 70,
    assigned_by: "preference",
    investigation_result: null,
    ...overrides,
  };
}

describe("NightPage", () => {
  it("shows a waiting message for a citizen (no night action)", () => {
    render(
      <NightPage
        session={{ roomId: "r1", playerId: "p2", isHost: false }}
        state={state}
        myView={myView({ player_id: "p2", role: "citizen" })}
      />
    );
    expect(screen.getByText("밤이 되었습니다. 다른 사람들이 움직이는 동안 기다려주세요.")).toBeInTheDocument();
  });

  it("lets mafia pick a kill target and submits the kill action", async () => {
    const spy = vi.spyOn(client, "submitNightAction").mockResolvedValue({ status: "ok" });
    render(
      <NightPage
        session={{ roomId: "r1", playerId: "p1", isHost: false }}
        state={state}
        myView={myView({ role: "mafia" })}
      />
    );

    fireEvent.click(screen.getAllByText("제거할 대상을 선택하세요")[0]);

    await waitFor(() => expect(spy).toHaveBeenCalledWith("r1", "p1", "kill", "p2"));
    expect(await screen.findByText("능력을 사용했습니다. 아침을 기다려주세요.")).toBeInTheDocument();
  });

  it("shows an error message instead of silently failing when the night action submission is rejected", async () => {
    vi.spyOn(client, "submitNightAction").mockRejectedValue(
      new Error("API error 400: Night actions are only allowed during NIGHT_ACTION phase")
    );
    render(
      <NightPage
        session={{ roomId: "r1", playerId: "p1", isHost: false }}
        state={state}
        myView={myView({ role: "police" })}
      />
    );

    fireEvent.click(screen.getAllByText("조사할 대상을 선택하세요")[0]);

    expect(
      await screen.findByText("API error 400: Night actions are only allowed during NIGHT_ACTION phase")
    ).toBeInTheDocument();
    expect(screen.queryByText("조사 중...")).not.toBeInTheDocument();
  });

  it("shows the police's investigation result from a previous night", () => {
    render(
      <NightPage
        session={{ roomId: "r1", playerId: "p1", isHost: false }}
        state={state}
        myView={myView({
          role: "police",
          investigation_result: { police_id: "p1", target_id: "p2", is_mafia: true },
        })}
      />
    );
    expect(screen.getByText(/마피아입니다!/)).toBeInTheDocument();
  });

  it("shows the detective-reveal effect when the investigation found the mafia", () => {
    const { container } = render(
      <NightPage
        session={{ roomId: "r1", playerId: "p1", isHost: false }}
        state={state}
        myView={myView({
          role: "police",
          investigation_result: { police_id: "p1", target_id: "p2", is_mafia: true },
        })}
      />
    );
    expect(container.querySelector(".night-effect-overlay--detective")).not.toBeNull();
  });

  it("does not show the detective-reveal effect when the investigation cleared the target", () => {
    const { container } = render(
      <NightPage
        session={{ roomId: "r1", playerId: "p1", isHost: false }}
        state={state}
        myView={myView({
          role: "police",
          investigation_result: { police_id: "p1", target_id: "p2", is_mafia: false },
        })}
      />
    );
    expect(container.querySelector(".night-effect-overlay--detective")).toBeNull();
  });

  it("never shows a manual advance button", () => {
    render(
      <NightPage
        session={{ roomId: "r1", playerId: "p1", isHost: true }}
        state={state}
        myView={myView({ player_id: "p1", role: "citizen" })}
      />
    );
    expect(screen.queryByText("아침이 밝았습니다")).not.toBeInTheDocument();
  });

  it("lets the host skip ahead, calling advancePhase", async () => {
    const spy = vi.spyOn(client, "advancePhase").mockResolvedValue({ phase: "DAY_DISCUSSION" });
    render(
      <NightPage
        session={{ roomId: "r1", playerId: "p1", isHost: true }}
        state={state}
        myView={myView({ player_id: "p1", role: "citizen" })}
      />
    );

    fireEvent.click(screen.getByText("건너뛰기 (관리자)"));

    await waitFor(() => expect(spy).toHaveBeenCalledWith("r1"));
  });

  it("shows the skip button for the host even when they have a night action to take", () => {
    render(
      <NightPage
        session={{ roomId: "r1", playerId: "p1", isHost: true }}
        state={state}
        myView={myView({ role: "mafia" })}
      />
    );
    expect(screen.getByText("건너뛰기 (관리자)")).toBeInTheDocument();
  });

  it("does not show the skip button for a non-host", () => {
    render(
      <NightPage
        session={{ roomId: "r1", playerId: "p2", isHost: false }}
        state={state}
        myView={myView({ player_id: "p2", role: "citizen" })}
      />
    );
    expect(screen.queryByText("건너뛰기 (관리자)")).not.toBeInTheDocument();
  });

  it("shows a private knife effect for the mafia right after they submit their kill", async () => {
    vi.spyOn(client, "submitNightAction").mockResolvedValue({ status: "ok" });
    const { container } = render(
      <NightPage
        session={{ roomId: "r1", playerId: "p1", isHost: false }}
        state={state}
        myView={myView({ role: "mafia" })}
      />
    );

    fireEvent.click(screen.getAllByText("제거할 대상을 선택하세요")[0]);

    await waitFor(() => expect(container.querySelector(".night-effect-overlay--knife")).not.toBeNull());
  });

  it("shows a private angel effect for the doctor right after they submit their protect", async () => {
    vi.spyOn(client, "submitNightAction").mockResolvedValue({ status: "ok" });
    const { container } = render(
      <NightPage
        session={{ roomId: "r1", playerId: "p1", isHost: false }}
        state={state}
        myView={myView({ role: "doctor" })}
      />
    );

    fireEvent.click(screen.getAllByText("보호할 대상을 선택하세요")[0]);

    await waitFor(() => expect(container.querySelector(".night-effect-overlay--angel")).not.toBeNull());
  });

  it("reveals the police's investigation result immediately after clicking, with no interim waiting state", async () => {
    vi.spyOn(client, "submitNightAction").mockResolvedValue({
      status: "ok",
      investigation_result: { police_id: "p1", target_id: "p2", is_mafia: true },
    });
    render(
      <NightPage
        session={{ roomId: "r1", playerId: "p1", isHost: false }}
        state={state}
        myView={myView({ role: "police", investigation_result: null })}
      />
    );

    fireEvent.click(screen.getAllByText("조사할 대상을 선택하세요")[0]);

    expect(await screen.findByText("마피아입니다!")).toBeInTheDocument();
    expect(screen.queryByText("조사 중...")).not.toBeInTheDocument();
  });

  it("reveals 시민입니다 immediately when the investigated target is not mafia", async () => {
    vi.spyOn(client, "submitNightAction").mockResolvedValue({
      status: "ok",
      investigation_result: { police_id: "p1", target_id: "p2", is_mafia: false },
    });
    render(
      <NightPage
        session={{ roomId: "r1", playerId: "p1", isHost: false }}
        state={state}
        myView={myView({ role: "police", investigation_result: null })}
      />
    );

    fireEvent.click(screen.getAllByText("조사할 대상을 선택하세요")[0]);

    expect(await screen.findByText("시민입니다")).toBeInTheDocument();
  });

  it("shows the detective flash effect at the same time as the instant reveal", async () => {
    vi.spyOn(client, "submitNightAction").mockResolvedValue({
      status: "ok",
      investigation_result: { police_id: "p1", target_id: "p2", is_mafia: true },
    });
    const { container } = render(
      <NightPage
        session={{ roomId: "r1", playerId: "p1", isHost: false }}
        state={state}
        myView={myView({ role: "police", investigation_result: null })}
      />
    );

    fireEvent.click(screen.getAllByText("조사할 대상을 선택하세요")[0]);

    await waitFor(() => expect(screen.getByText("마피아입니다!")).toBeInTheDocument());
    expect(container.querySelector(".night-effect-overlay--detective")).not.toBeNull();
  });

  it("shows an execution effect and the execution text when execution_result reports an execution", () => {
    const executedState: RoomState = {
      ...state,
      execution_result: { nickname: "라이트", executed: true },
    };
    const { container } = render(
      <NightPage
        session={{ roomId: "r1", playerId: "p1", isHost: false }}
        state={executedState}
        myView={myView({ role: "citizen" })}
      />
    );
    expect(screen.getByText("라이트님이 처형당했습니다.")).toBeInTheDocument();
    expect(container.querySelector(".night-effect-overlay--executed")).not.toBeNull();
  });

  it("shows a spared effect and the spared text when execution_result reports a pardon", () => {
    const sparedState: RoomState = {
      ...state,
      execution_result: { nickname: "라이트", executed: false },
    };
    const { container } = render(
      <NightPage
        session={{ roomId: "r1", playerId: "p1", isHost: false }}
        state={sparedState}
        myView={myView({ role: "citizen" })}
      />
    );
    expect(screen.getByText("라이트님이 무죄로 풀려났습니다.")).toBeInTheDocument();
    expect(container.querySelector(".night-effect-overlay--spared")).not.toBeNull();
  });

  it("shows no execution effect when execution_result is null", () => {
    const { container } = render(
      <NightPage
        session={{ roomId: "r1", playerId: "p1", isHost: false }}
        state={state}
        myView={myView({ role: "citizen" })}
      />
    );
    expect(container.querySelector(".night-effect-overlay--executed")).toBeNull();
    expect(container.querySelector(".night-effect-overlay--spared")).toBeNull();
  });
});
