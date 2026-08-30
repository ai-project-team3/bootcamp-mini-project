import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomePage } from "./HomePage";
import * as client from "../api/client";

describe("HomePage", () => {
  it("creates a room, joins as that room's first player, and reports the session", async () => {
    vi.spyOn(client, "createRoom").mockResolvedValue({ room_id: "room1" });
    vi.spyOn(client, "joinRoom").mockResolvedValue({ player_id: "p1", is_host: true });
    const onJoined = vi.fn();

    render(<HomePage onJoined={onJoined} />);
    fireEvent.change(screen.getByLabelText("닉네임"), { target: { value: "정글짐" } });
    fireEvent.click(screen.getByRole("button", { name: "새 방 만들기" }));

    await waitFor(() =>
      expect(onJoined).toHaveBeenCalledWith({ roomId: "room1", playerId: "p1", isHost: true })
    );
    expect(client.joinRoom).toHaveBeenCalledWith("room1", "정글짐");
  });

  it("joins an existing room by code", async () => {
    vi.spyOn(client, "joinRoom").mockResolvedValue({ player_id: "p2", is_host: false });
    const onJoined = vi.fn();

    render(<HomePage onJoined={onJoined} />);
    fireEvent.change(screen.getByLabelText("닉네임"), { target: { value: "손님" } });
    fireEvent.change(screen.getByLabelText("초대코드"), { target: { value: "ROOM9" } });
    fireEvent.click(screen.getByRole("button", { name: "방 참가하기" }));

    await waitFor(() =>
      expect(onJoined).toHaveBeenCalledWith({ roomId: "ROOM9", playerId: "p2", isHost: false })
    );
  });

  it("creates the room with the table size chosen in the mafia-only option", async () => {
    vi.spyOn(client, "createRoom").mockResolvedValue({ room_id: "room1" });
    vi.spyOn(client, "joinRoom").mockResolvedValue({ player_id: "p1", is_host: true });

    render(<HomePage onJoined={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("닉네임"), { target: { value: "정글짐" } });
    fireEvent.click(within(screen.getByRole("group", { name: "인원수" })).getByText("7명"));
    fireEvent.click(screen.getByRole("button", { name: "새 방 만들기" }));

    await waitFor(() => expect(client.createRoom).toHaveBeenCalledWith(7));
  });

  it("prefills the code for someone arriving on an invite link", () => {
    render(<HomePage onJoined={vi.fn()} initialRoomCode="ABC123" />);
    expect(screen.getByLabelText("초대코드")).toHaveValue("ABC123");
  });
});
