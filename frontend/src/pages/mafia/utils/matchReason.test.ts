import { describe, expect, it } from "vitest";
import { buildMatchReason } from "./matchReason";
import type { ResultPlayer } from "../api/types";

function player(overrides: Partial<ResultPlayer>): ResultPlayer {
  return {
    player_id: "p1",
    nickname: "정글짐",
    role: "police",
    is_alive: true,
    assigned_score: 82,
    assigned_by: "preference",
    persona_scores: { DOM: 30, SPD: 60, EXP: 50, EMP: 40, OBS: 90 },
    ...overrides,
  };
}

describe("buildMatchReason", () => {
  it("cites the highest-scoring axis for a preference-based assignment", () => {
    const reason = buildMatchReason(player({ role: "police" }));
    expect(reason).toContain("관찰력 90");
    expect(reason).toContain("경찰");
  });

  it("uses fallback narrative language for a fallback mafia assignment", () => {
    const reason = buildMatchReason(
      player({ role: "mafia", assigned_by: "fallback_random" })
    );
    expect(reason).toContain("운명");
    expect(reason).toContain("마피아");
  });

  it("uses generic fallback narrative language for non-mafia fallback assignments", () => {
    const reason = buildMatchReason(
      player({ role: "citizen", assigned_by: "fallback_random" })
    );
    expect(reason).toContain("운명");
    expect(reason).toContain("시민");
  });
});
