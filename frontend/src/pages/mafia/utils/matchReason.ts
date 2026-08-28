import type { PersonaScores, ResultPlayer } from "../api/types";

const AXIS_LABELS: Record<keyof PersonaScores, string> = {
  initiative: "주도성",
  analysis: "분석력",
  empathy: "공감력",
  caution: "신중함",
};

const ROLE_LABELS: Record<ResultPlayer["role"], string> = {
  mafia: "마피아",
  police: "경찰",
  doctor: "의사",
  citizen: "시민",
};

function topAxis(persona: PersonaScores): keyof PersonaScores {
  const axes = Object.keys(AXIS_LABELS) as (keyof PersonaScores)[];
  return axes.reduce((best, axis) => (persona[axis] > persona[best] ? axis : best), axes[0]);
}

export function buildMatchReason(player: ResultPlayer): string {
  const roleLabel = ROLE_LABELS[player.role];

  if (player.assigned_by === "fallback_random") {
    if (player.role === "mafia") {
      return "이번엔 아무도 어둠을 자처하지 않았습니다. 공감력이 가장 낮았던 당신에게 운명이 마피아를 맡겼습니다.";
    }
    return `뚜렷한 특기가 갈리지 않아, 운명이 당신을 ${roleLabel}(으)로 이끌었습니다.`;
  }

  const axis = topAxis(player.persona_scores);
  const value = player.persona_scores[axis];
  const label = AXIS_LABELS[axis];
  return `${label} ${value}(으)로 이 방에서 두드러졌던 당신, ${roleLabel}(으)로 발탁되었습니다.`;
}
