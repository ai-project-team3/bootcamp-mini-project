import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoom, joinRoom, rollDice, submitAnswer } from "./client";

function mockFetch(body: unknown = {}, ok = true, status = 200) {
  const spy = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
  vi.stubGlobal("fetch", spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("marble api client", () => {
  it("creates a room with the chosen content mode", async () => {
    const spy = mockFetch({ room_id: "ABC123" });
    const result = await createRoom("adult", 2);

    expect(result.room_id).toBe("ABC123");
    const [url, init] = spy.mock.calls[0];
    expect(url).toContain("/rooms");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ content_mode: "adult", max_players: 2 });
  });

  it("joins a room with a nickname", async () => {
    const spy = mockFetch({ player_id: "p1", is_host: true });
    const result = await joinRoom("ABC123", "민수");

    expect(result.is_host).toBe(true);
    const [url, init] = spy.mock.calls[0];
    expect(url).toContain("/rooms/ABC123/join");
    expect(JSON.parse(init.body)).toEqual({ nickname: "민수" });
  });

  it("sends the player id when rolling", async () => {
    const spy = mockFetch();
    await rollDice("ABC123", "p1");

    const [url, init] = spy.mock.calls[0];
    expect(url).toContain("/rooms/ABC123/roll");
    expect(JSON.parse(init.body)).toEqual({ player_id: "p1" });
  });

  it("sends the chosen index when answering", async () => {
    const spy = mockFetch();
    await submitAnswer("ABC123", "p1", 2);

    const [, init] = spy.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ player_id: "p1", choice_index: 2 });
  });

  it("throws with the status when the server rejects the action", async () => {
    mockFetch({ detail: "It is not your turn" }, false, 409);
    await expect(rollDice("ABC123", "p2")).rejects.toThrow(/409/);
  });
});
