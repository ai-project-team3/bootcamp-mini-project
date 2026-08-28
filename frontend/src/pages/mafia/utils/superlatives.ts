import type { PersonaScores, ResultPlayer } from "../api/types";

export interface Superlative {
  title: string;
  player: ResultPlayer;
}

// backend spec §3.2's mafia weight formula, ported here for display only —
// this never decides an actual role, it only ranks players for the "가장
// 마피아다웠던 사람" superlative on the result screen.
function mafiaLikeScore(persona: PersonaScores): number {
  return 0.4 * persona.initiative + 0.35 * (100 - persona.empathy) + 0.25 * persona.caution;
}

export function computeSuperlatives(players: ResultPlayer[]): Superlative[] {
  if (players.length === 0) return [];

  const mostMafiaLike = [...players].sort(
    (a, b) => mafiaLikeScore(b.persona_scores) - mafiaLikeScore(a.persona_scores)
  )[0];
  const mostCautious = [...players].sort(
    (a, b) => b.persona_scores.caution - a.persona_scores.caution
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
