import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PersonaRadarChart, personaToPolygonPoints } from "./PersonaRadarChart";

describe("personaToPolygonPoints", () => {
  it("puts the first axis (DOM) straight up from center at max value", () => {
    const points = personaToPolygonPoints({ DOM: 100, SPD: 0, EXP: 50, EMP: 0, OBS: 0 });
    const [x, y] = points.split(" ")[0].split(",").map(Number);
    expect(x).toBeCloseTo(100);
    expect(y).toBeCloseTo(20);
  });

  it("collapses every point to the center when all scores are zero", () => {
    const points = personaToPolygonPoints({ DOM: 0, SPD: 0, EXP: 0, EMP: 0, OBS: 0 });
    for (const pair of points.split(" ")) {
      const [x, y] = pair.split(",").map(Number);
      expect(x).toBeCloseTo(100);
      expect(y).toBeCloseTo(100);
    }
  });
});

describe("PersonaRadarChart", () => {
  it("renders an accessible svg with all five axis labels", () => {
    render(
      <PersonaRadarChart persona={{ DOM: 82, SPD: 55, EXP: 50, EMP: 40, OBS: 65 }} />
    );
    expect(screen.getByRole("img", { name: "페르소나 성향 레이더 차트" })).toBeInTheDocument();
    for (const label of ["주도력", "순발력", "표현력", "공감력", "관찰력"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
