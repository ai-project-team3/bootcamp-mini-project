import { describe, expect, it } from "vitest";
import { computeSuperlatives } from "./superlatives";
import type { ResultPlayer } from "../api/types";

function player(overrides: Partial<ResultPlayer>): ResultPlayer {
  return {
    player_id: "p",
    nickname: "p",
    role: "citizen",
    is_alive: true,
    assigned_score: 50,
    assigned_by: "preference",
    persona_scores: { initiative: 50, analysis: 50, empathy: 50, caution: 50 },
    ...overrides,
  };
}

describe("computeSuperlatives", () => {
  it("returns an empty list for no players", () => {
    expect(computeSuperlatives([])).toEqual([]);
  });

  it("picks the highest mafia-formula score as 가장 마피아다웠던 사람", () => {
    const spiky = player({
      player_id: "spiky",
      persona_scores: { initiative: 100, analysis: 50, empathy: 0, caution: 100 },
    });
    const flat = player({ player_id: "flat" });
    const result = computeSuperlatives([flat, spiky]);
    const mafiaLike = result.find((s) => s.title === "가장 마피아다웠던 사람");
    expect(mafiaLike?.player.player_id).toBe("spiky");
  });

  it("picks the highest caution score as 가장 신중했던 사람", () => {
    const cautious = player({
      player_id: "cautious",
      persona_scores: { initiative: 50, analysis: 50, empathy: 50, caution: 99 },
    });
    const result = computeSuperlatives([player({ player_id: "other" }), cautious]);
    const mostCautious = result.find((s) => s.title === "가장 신중했던 사람");
    expect(mostCautious?.player.player_id).toBe("cautious");
  });

  it("includes 가장 의외의 반전 only when a fallback assignment exists", () => {
    const withFallback = computeSuperlatives([
      player({ player_id: "a" }),
      player({ player_id: "b", assigned_by: "fallback_random" }),
    ]);
    expect(withFallback.some((s) => s.title === "가장 의외의 반전")).toBe(true);

    const withoutFallback = computeSuperlatives([player({ player_id: "a" })]);
    expect(withoutFallback.some((s) => s.title === "가장 의외의 반전")).toBe(false);
  });

  it("includes 생존왕 only when someone is alive", () => {
    const alive = computeSuperlatives([player({ player_id: "a", is_alive: true })]);
    expect(alive.some((s) => s.title === "생존왕")).toBe(true);

    const allDead = computeSuperlatives([player({ player_id: "a", is_alive: false })]);
    expect(allDead.some((s) => s.title === "생존왕")).toBe(false);
  });
});
