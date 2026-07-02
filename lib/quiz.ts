export interface QuizCounts {
  correct: number;
  almost: number;
  wrong: number;
}

/** Weighted success: correct = 100%, almost = 50%, wrong = 0%. */
export function quizScore({ correct, almost, wrong }: QuizCounts): number {
  const total = correct + almost + wrong;
  if (total === 0) return 0;
  return Math.round(((correct + almost * 0.5) / total) * 100);
}
