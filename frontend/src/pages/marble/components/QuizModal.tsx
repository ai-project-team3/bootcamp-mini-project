import type { BenefitCard, ChanceCard, RoomQuiz } from "../api/types";

interface QuizModalProps {
  quiz: RoomQuiz;
  /** True once the server has judged the answer. */
  answered: boolean;
  /** Only the player on turn may pick; the opponent watches. */
  canAnswer: boolean;
  lastAnswerCorrect: boolean | null;
  selectedIndex: number | null;
  assignedForfeit: string | null;
  lastChanceCard: ChanceCard | null;
  onAnswer: (choiceIndex: number) => void;
  onForfeitComplete: () => void;
}

const BENEFIT_REVEAL: Record<BenefitCard, string> = {
  EXTRA_ROLL: "🎲 한 번 더 굴리기 획득!",
  SCORE_DOUBLE: "🎯 다음 정답 점수 2배!",
  FORFEIT_IMMUNITY: "🛡️ 다음 오답 벌칙 면제!",
  EXTRA_HOP: "👟 한 칸 더 전진!",
  SKIP_OPPONENT: "⏭️ 상대방 턴 스킵!",
};

export function QuizModal({
  quiz,
  answered,
  canAnswer,
  lastAnswerCorrect,
  selectedIndex,
  assignedForfeit,
  lastChanceCard,
  onAnswer,
  onForfeitComplete,
}: QuizModalProps) {
  return (
    <div className="pm-modal-backdrop" role="dialog" aria-modal="true">
      <div className="pm-modal">
        <p className="pm-eyebrow">상대 성향 퀴즈</p>
        <p className="pm-modal__question">{quiz.question}</p>
        <div className="pm-modal__choices">
          {quiz.choices.map((choice, index) => {
            let className = "pm-choice";
            if (answered) {
              if (lastAnswerCorrect && index === selectedIndex) className += " pm-choice--correct";
              else if (!lastAnswerCorrect && index === selectedIndex) className += " pm-choice--incorrect";
            }
            return (
              <button
                key={choice}
                type="button"
                className={className}
                disabled={answered || !canAnswer}
                onClick={() => onAnswer(index)}
              >
                {choice}
              </button>
            );
          })}
        </div>

        {!answered && !canAnswer && (
          <p className="pm-modal__feedback">상대가 답을 고르는 중이에요...</p>
        )}

        {answered && (
          <>
            <p
              className={`pm-modal__feedback ${
                lastAnswerCorrect ? "pm-modal__feedback--correct" : "pm-modal__feedback--incorrect"
              }`}
            >
              {lastAnswerCorrect ? "정답이에요! 🎉" : "아쉬워요, 오답이에요."}
            </p>
            {lastChanceCard?.kind === "benefit" && lastChanceCard.benefit && (
              <p className="pm-modal__card pm-modal__card--benefit">
                {BENEFIT_REVEAL[lastChanceCard.benefit]}
              </p>
            )}
            {assignedForfeit && (
              <p className="pm-modal__card pm-modal__card--forfeit">
                {lastChanceCard?.kind === "penalty" ? "찬스 카드 벌칙 발동! " : "벌칙: "}
                {assignedForfeit}
              </p>
            )}
            {canAnswer ? (
              <button type="button" className="pm-button pm-button--primary" onClick={onForfeitComplete}>
                {assignedForfeit ? "수행 완료" : "다음으로"}
              </button>
            ) : (
              <p className="pm-modal__feedback">상대가 진행하기를 기다리는 중...</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
