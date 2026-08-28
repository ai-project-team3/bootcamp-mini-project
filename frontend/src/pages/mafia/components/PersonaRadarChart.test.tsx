import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PersonaRadarChart, personaToPolygonPoints } from "./PersonaRadarChart";

describe("personaToPolygonPoints", () => {
  it("puts the first axis (initiative) straight up from center at max value", () => {
    const points = personaToPolygonPoints({ initiative: 100, analysis: 0, empathy: 0, caution: 0 });
    const [x, y] = points.split(" ")[0].split(",").map(Number);
    expect(x).toBeCloseTo(100);
    expect(y).toBeCloseTo(20);
  });

  it("collapses every point to the center when all scores are zero", () => {
    const points = personaToPolygonPoints({ initiative: 0, analysis: 0, empathy: 0, caution: 0 });
    for (const pair of points.split(" ")) {
      const [x, y] = pair.split(",").map(Number);
      expect(x).toBeCloseTo(100);
      expect(y).toBeCloseTo(100);
    }
  });
});

describe("PersonaRadarChart", () => {
  it("renders an accessible svg with all four axis labels", () => {
    render(
      <PersonaRadarChart persona={{ initiative: 82, analysis: 65, empathy: 40, caution: 55 }} />
    );
    expect(screen.getByRole("img", { name: "페르소나 성향 레이더 차트" })).toBeInTheDocument();
    expect(screen.getByText("주도성")).toBeInTheDocument();
    expect(screen.getByText("분석력")).toBeInTheDocument();
    expect(screen.getByText("공감력")).toBeInTheDocument();
    expect(screen.getByText("신중함")).toBeInTheDocument();
  });
});
