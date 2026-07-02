import { describe, expect, it } from 'vitest';
import { quizScore } from './quiz';

describe('quizScore', () => {
  it('is 0 for an empty quiz', () => {
    expect(quizScore({ correct: 0, almost: 0, wrong: 0 })).toBe(0);
  });
  it('is 100 when all correct', () => {
    expect(quizScore({ correct: 10, almost: 0, wrong: 0 })).toBe(100);
  });
  it('is 0 when all wrong', () => {
    expect(quizScore({ correct: 0, almost: 0, wrong: 10 })).toBe(0);
  });
  it('counts almost as half', () => {
    expect(quizScore({ correct: 0, almost: 2, wrong: 0 })).toBe(50);
    expect(quizScore({ correct: 1, almost: 1, wrong: 0 })).toBe(75);
  });
  it('rounds to a whole percent', () => {
    // (2 + 0.5*1) / 3 = 0.8333 → 83
    expect(quizScore({ correct: 2, almost: 1, wrong: 0 })).toBe(83);
  });
});
