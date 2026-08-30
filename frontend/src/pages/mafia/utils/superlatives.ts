import type { PersonaScores, ResultPlayer } from "../api/types";

export interface Superlative {
  title: string;
  player: ResultPlayer;
}

// The backend's mafia weighting (roles/weights.py), ported here for display
// only — this never decides an actual role, it only ranks players for the
// "가장 마피아다웠던 사람" superlative on the result screen.
function mafiaLikeScore(persona: PersonaScores): number {
  return (
    0.3 * persona.DOM +
    0.25 * (100 - persona.EMP) +
    0.2 * (100 - persona.SPD) +
    0.25 * (100 - persona.EXP)
  );
}

// 신중함은 따로 재는 축이 아니라 순발력의 반대다 — docs/페르소나-인계.md.
function cautionScore(persona: PersonaScores): number {
  return 100 - persona.SPD;
}

export function computeSuperlatives(players: ResultPlayer[]): Superlative[] {
  if (players.length === 0) return [];

  const mostMafiaLike = [...players].sort(
    (a, b) => mafiaLikeScore(b.persona_scores) - mafiaLikeScore(a.persona_scores)
  )[0];
  const mostCautious = [...players].sort(
    (a, b) => cautionScore(b.persona_scores) - cautionScore(a.persona_scores)
  )[0];
  const twist = players.find((p) => p.assigned_by === "fallback_random");
  const survivor = players.find((p) => p.is_alive);

  const superlatives: Superlative[] = [
    { title: "가장 마피아다웠던 사람", player: mostMafiaLike },
    { title: "가장 신중했던 사람", player: mostCautious },
  ];
  if (twist) {
    superlatives.push({ title: "가장 의외의 반전", player: twist });
  }
  if (survivor) {
    superlatives.push({ title: "생존왕", player: survivor });
  }
  return superlatives;
}
