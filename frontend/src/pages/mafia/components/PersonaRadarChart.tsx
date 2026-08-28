import type { PersonaScores } from "../api/types";

const AXES: { key: keyof PersonaScores; label: string }[] = [
  { key: "initiative", label: "주도성" },
  { key: "analysis", label: "분석력" },
  { key: "empathy", label: "공감력" },
  { key: "caution", label: "신중함" },
];

const SIZE = 200;
const CENTER = SIZE / 2;
const MAX_RADIUS = 80;

function pointFor(index: number, value: number): [number, number] {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / AXES.length;
  const radius = (value / 100) * MAX_RADIUS;
  return [CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle)];
}

export function personaToPolygonPoints(persona: PersonaScores): string {
  return AXES.map((axis, i) => pointFor(i, persona[axis.key]).join(",")).join(" ");
}

export function PersonaRadarChart({ persona }: { persona: PersonaScores }) {
  const gridLevels = [25, 50, 75, 100];

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={SIZE}
      height={SIZE}
      role="img"
      aria-label="페르소나 성향 레이더 차트"
    >
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={AXES.map((_, i) => pointFor(i, level).join(",")).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.15}
        />
      ))}
      {AXES.map((axis, i) => {
        const [x, y] = pointFor(i, 100);
        return (
          <line key={axis.key} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="currentColor" strokeOpacity={0.15} />
        );
      })}
      <polygon
        points={personaToPolygonPoints(persona)}
        fill="currentColor"
        fillOpacity={0.25}
        stroke="currentColor"
        strokeWidth={2}
      />
      {AXES.map((axis, i) => {
        const [x, y] = pointFor(i, 118);
        return (
          <text key={axis.key} x={x} y={y} fontSize={11} textAnchor="middle" dominantBaseline="middle">
            {axis.label}
          </text>
        );
      })}
    </svg>
  );
}
