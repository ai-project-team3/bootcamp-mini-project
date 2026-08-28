import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MarbleApp } from "./MarbleApp";
import * as client from "./api/client";
import { makePlayer, makeRoomState } from "./test/fixtures";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MarbleApp", () => {
  it("shows the lobby first", async () => {
    render(<MarbleApp />);
    expect(await screen.findByRole("tab", { name: "방 만들기" })).toBeInTheDocument();
    expect(screen.getByLabelText("닉네임")).toBeInTheDocument();
  });

  it("keeps the create button disabled until a nickname is entered", async () => {
    render(<MarbleApp />);
    const button = await screen.findByRole("button", { name: "방 만들기" });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText("닉네임"), { target: { value: "민수" } });
    expect(button).not.toBeDisabled();
  });

  it("creates a room then joins it, landing in the waiting room", async () => {
    vi.spyOn(client, "createRoom").mockResolvedValue({ room_id: "ABC123" });
    vi.spyOn(client, "joinRoom").mockResolvedValue({ player_id: "p1", is_host: true });
    vi.spyOn(client, "getRoomState").mockResolvedValue(
      makeRoomState({ phase: "WAITING", players: [makePlayer({ player_id: "p1", nickname: "민수" })] })
    );

    render(<MarbleApp />);
    fireEvent.change(await screen.findByLabelText("닉네임"), { target: { value: "민수" } });
    fireEvent.click(screen.getByRole("button", { name: "방 만들기" }));

    await waitFor(() => expect(screen.getByText("ABC123")).toBeInTheDocument());
    expect(screen.getByText("대기실")).toBeInTheDocument();
    expect(client.createRoom).toHaveBeenCalledWith("general", 2);
  });

  it("passes the chosen content mode when creating the room", async () => {
    vi.spyOn(client, "createRoom").mockResolvedValue({ room_id: "ABC123" });
    vi.spyOn(client, "joinRoom").mockResolvedValue({ player_id: "p1", is_host: true });
    vi.spyOn(client, "getRoomState").mockResolvedValue(makeRoomState({ phase: "WAITING" }));

    render(<MarbleApp />);
    fireEvent.click(await screen.findByTestId("pm-mode-adult"));
    fireEvent.change(screen.getByLabelText("닉네임"), { target: { value: "민수" } });
    fireEvent.click(screen.getByRole("button", { name: "방 만들기" }));

    await waitFor(() => expect(client.createRoom).toHaveBeenCalledWith("adult", 2));
  });

  it("joins an existing room by code", async () => {
    vi.spyOn(client, "joinRoom").mockResolvedValue({ player_id: "p2", is_host: false });
    vi.spyOn(client, "getRoomState").mockResolvedValue(makeRoomState({ phase: "WAITING" }));

    render(<MarbleApp />);
    fireEvent.click(await screen.findByRole("tab", { name: "방 참여하기" }));
    fireEvent.change(screen.getByLabelText("방 코드"), { target: { value: "xyz789" } });
    fireEvent.change(screen.getByLabelText("닉네임"), { target: { value: "지은" } });
    fireEvent.click(screen.getByRole("button", { name: "방 참여하기" }));

    // The code is normalised to upper case before it reaches the server.
    await waitFor(() => expect(client.joinRoom).toHaveBeenCalledWith("XYZ789", "지은"));
  });

  it("surfaces a join failure instead of leaving the lobby", async () => {
    vi.spyOn(client, "joinRoom").mockRejectedValue(new Error("API error 400: Room is full"));

    render(<MarbleApp />);
    fireEvent.click(await screen.findByRole("tab", { name: "방 참여하기" }));
    fireEvent.change(screen.getByLabelText("방 코드"), { target: { value: "ABC123" } });
    fireEvent.change(screen.getByLabelText("닉네임"), { target: { value: "제삼자" } });
    fireEvent.click(screen.getByRole("button", { name: "방 참여하기" }));

    await waitFor(() => expect(screen.getByText(/Room is full/)).toBeInTheDocument());
    expect(screen.getByLabelText("닉네임")).toBeInTheDocument();
  });

  it("renders the board once the game starts", async () => {
    window.localStorage.setItem(
      "personaMarble.session",
      JSON.stringify({ roomId: "ABC123", playerId: "p1", isHost: true })
    );
    vi.spyOn(client, "getRoomState").mockResolvedValue(makeRoomState({ phase: "ROLL_DICE" }));

    render(<MarbleApp />);

    await waitFor(() => expect(screen.getByText("주사위 굴리기")).toBeInTheDocument());
    expect(screen.getByTestId("pm-tile-0")).toBeInTheDocument();
  });

  it("disables the dice for the player who is not on turn", async () => {
    window.localStorage.setItem(
      "personaMarble.session",
      JSON.stringify({ roomId: "ABC123", playerId: "p2", isHost: false })
    );
    vi.spyOn(client, "getRoomState").mockResolvedValue(
      makeRoomState({ phase: "ROLL_DICE", current_player_id: "p1" })
    );

    render(<MarbleApp />);

    await waitFor(() => expect(screen.getByText("주사위 굴리기")).toBeDisabled());
    expect(screen.getByText(/민수님 차례/)).toBeInTheDocument();
  });

  it("shows the winner when the room reports a completed lap", async () => {
    window.localStorage.setItem(
      "personaMarble.session",
      JSON.stringify({ roomId: "ABC123", playerId: "p1", isHost: true })
    );
    vi.spyOn(client, "getRoomState").mockResolvedValue(
      makeRoomState({
        phase: "GAME_OVER",
        winner_id: "p1",
        chemistry_summary: "총평입니다",
        players: [
          makePlayer({ player_id: "p1", nickname: "민수", steps_moved: 12, score: 70 }),
          makePlayer({ player_id: "p2", nickname: "지은", steps_moved: 8, score: 50 }),
        ],
      })
    );

    render(<MarbleApp />);

    await waitFor(() => expect(screen.getByText("민수님 완주 승리!")).toBeInTheDocument());
    expect(screen.getByText("총평입니다")).toBeInTheDocument();
  });

  it("drops a session whose room no longer exists", async () => {
    window.localStorage.setItem(
      "personaMarble.session",
      JSON.stringify({ roomId: "GONE", playerId: "p1", isHost: true })
    );
    vi.spyOn(client, "getRoomState").mockRejectedValue(new Error("API error 404: Room not found"));

    render(<MarbleApp />);

    await waitFor(() => expect(screen.getByText(/이전 방을 찾을 수 없어요/)).toBeInTheDocument());
    expect(screen.getByLabelText("닉네임")).toBeInTheDocument();
  });
});
