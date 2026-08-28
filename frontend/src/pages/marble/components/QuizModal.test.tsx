import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QuizModal } from "./QuizModal";
import type { RoomQuiz } from "../api/types";

const quiz: RoomQuiz = {
  tile_type: "LOGIC",
  question: "지은님이 갈등 상황에서 주로 보이는 태도는?",
  choices: ["a", "b", "c", "d"],
};

const base = {
  quiz,
  answered: false,
  canAnswer: true,
  lastAnswerCorrect: null,
  selectedIndex: null,
  assignedForfeit: null,
  lastChanceCard: null,
  onAnswer: () => {},
  onForfeitComplete: () => {},
};

describe("QuizModal", () => {
  it("shows the question and four choices", () => {
    render(<QuizModal {...base} />);
    expect(screen.getByText(quiz.question)).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(4);
  });

  it("calls onAnswer with the clicked index", () => {
    const onAnswer = vi.fn();
    render(<QuizModal {...base} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByText("c"));
    expect(onAnswer).toHaveBeenCalledWith(2);
  });

  it("disables the choices for the player who is not on turn", () => {
    render(<QuizModal {...base} canAnswer={false} />);
    expect(screen.getByText("a").closest("button")).toBeDisabled();
    expect(screen.getByText(/상대가 답을 고르는 중/)).toBeInTheDocument();
  });

  it("marks the chosen answer right or wrong once judged", () => {
    render(<QuizModal {...base} answered lastAnswerCorrect={false} selectedIndex={0} assignedForfeit="벌칙!" />);
    expect(screen.getByText("a").closest("button")?.className).toContain("pm-choice--incorrect");
    expect(screen.getByText("아쉬워요, 오답이에요.")).toBeInTheDocument();
  });

  it("shows the assigned forfeit and waits for the completion button", () => {
    render(<QuizModal {...base} answered lastAnswerCorrect={false} selectedIndex={0} assignedForfeit="애교 부리기" />);
    expect(screen.getByText(/애교 부리기/)).toBeInTheDocument();
    expect(screen.getByText("수행 완료")).toBeInTheDocument();
  });

  it("labels the button 다음으로 when there is no forfeit", () => {
    render(<QuizModal {...base} answered lastAnswerCorrect selectedIndex={1} />);
    expect(screen.getByText("다음으로")).toBeInTheDocument();
  });

  it("calls onForfeitComplete when acknowledged", () => {
    const onForfeitComplete = vi.fn();
    render(
      <QuizModal
        {...base}
        answered
        lastAnswerCorrect={false}
        selectedIndex={0}
        assignedForfeit="벌칙!"
        onForfeitComplete={onForfeitComplete}
      />
    );
    fireEvent.click(screen.getByText("수행 완료"));
    expect(onForfeitComplete).toHaveBeenCalledOnce();
  });

  it("shows the benefit card reveal", () => {
    render(
      <QuizModal
        {...base}
        answered
        lastAnswerCorrect
        selectedIndex={1}
        lastChanceCard={{ kind: "benefit", benefit: "SCORE_DOUBLE" }}
      />
    );
    expect(screen.getByText(/점수 2배/)).toBeInTheDocument();
  });

  it("tells the watching player to wait after the answer", () => {
    render(<QuizModal {...base} answered canAnswer={false} lastAnswerCorrect selectedIndex={1} />);
    expect(screen.getByText(/상대가 진행하기를 기다리는 중/)).toBeInTheDocument();
  });
});
