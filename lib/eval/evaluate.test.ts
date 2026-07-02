import { describe, expect, it } from 'vitest';
import { evaluateAnswer } from './evaluate';
import { differsOnlyByArticle } from './articles';
import { normalize, foldDiacritics } from './normalize';
import { levenshtein, typoThreshold } from './levenshtein';
import type { EvaluableExercise } from './types';

const open = (correct: string, acceptable: string[] = []): EvaluableExercise => ({
  type: 'vocab_en_sk',
  correct_answer: correct,
  acceptable_answers: acceptable,
  payload: { correct_answer: correct, acceptable_answers: acceptable },
});

describe('normalize / foldDiacritics', () => {
  it('trims, lowercases, strips punctuation, collapses whitespace', () => {
    expect(normalize('  The   Cat! ')).toBe('the cat');
    expect(normalize('mother-in-law')).toBe('mother-in-law');
    expect(normalize("don't")).toBe("don't");
  });
  it('preserves diacritics in the primary form', () => {
    expect(normalize('súd')).toBe('súd');
    expect(foldDiacritics(normalize('súd'))).toBe('sud');
  });
});

describe('levenshtein / typoThreshold', () => {
  it('computes distance', () => {
    expect(levenshtein('beautiful', 'beatiful')).toBe(1);
    expect(levenshtein('cat', 'dog')).toBe(3);
  });
  it('scales threshold by length', () => {
    expect(typoThreshold(3)).toBe(0);
    expect(typoThreshold(7)).toBe(1);
    expect(typoThreshold(9)).toBe(2);
  });
});

describe('differsOnlyByArticle', () => {
  it('detects article-only differences', () => {
    expect(differsOnlyByArticle(normalize('apple'), normalize('an apple'))).toBe(true);
    expect(differsOnlyByArticle(normalize('the house'), normalize('house'))).toBe(true);
  });
  it('is false when a non-article word differs', () => {
    expect(differsOnlyByArticle(normalize('red apple'), normalize('an apple'))).toBe(false);
  });
});

describe('evaluateAnswer — open', () => {
  it('exact → correct/exact', () => {
    expect(evaluateAnswer(open('odložiť'), 'odložiť')).toEqual({ verdict: 'correct', reason: 'exact' });
  });
  it('case/punctuation only → correct/normalized', () => {
    expect(evaluateAnswer(open('Odložiť'), 'odložiť!')).toEqual({ verdict: 'correct', reason: 'normalized' });
  });
  it('acceptable variant → correct/accepted_variant', () => {
    expect(evaluateAnswer(open('odložiť', ['posunúť']), 'posunúť')).toEqual({
      verdict: 'correct',
      reason: 'accepted_variant',
    });
  });
  it('missed accents → almost/typo', () => {
    expect(evaluateAnswer(open('odložiť'), 'odlozit')).toEqual({ verdict: 'almost', reason: 'typo' });
  });
  it('article-only → almost/missing_article', () => {
    const ex = open('an elephant');
    expect(evaluateAnswer(ex, 'elephant')).toEqual({ verdict: 'almost', reason: 'missing_article' });
  });
  it('one-char typo on a long word → almost/typo', () => {
    expect(evaluateAnswer(open('beautiful'), 'beatiful')).toEqual({ verdict: 'almost', reason: 'typo' });
  });
  it('typo on a short word is NOT forgiven → wrong', () => {
    expect(evaluateAnswer(open('dog'), 'dgo').verdict).toBe('wrong');
  });
  it('empty input → wrong/empty', () => {
    expect(evaluateAnswer(open('cat'), '   ')).toEqual({ verdict: 'wrong', reason: 'empty' });
  });
  it('genuinely wrong → wrong/mismatch', () => {
    expect(evaluateAnswer(open('cat'), 'elephant')).toEqual({ verdict: 'wrong', reason: 'mismatch' });
  });
});

describe('evaluateAnswer — multiple choice', () => {
  const mc: EvaluableExercise = {
    type: 'vocab_multiple_choice',
    correct_answer: 'reluctant',
    payload: { prompt: 'She was ___ to admit it.', options: ['reluctant', 'eager', 'keen'], correct_index: 0 },
  };
  it('correct option', () => {
    expect(evaluateAnswer(mc, 'reluctant')).toEqual({ verdict: 'correct', reason: 'exact' });
  });
  it('wrong option', () => {
    expect(evaluateAnswer(mc, 'eager')).toEqual({ verdict: 'wrong', reason: 'wrong_option' });
  });
});

describe('evaluateAnswer — matching', () => {
  const m: EvaluableExercise = {
    type: 'vocab_matching',
    correct_answer: null,
    payload: {
      pairs: [
        { left: 'reluctant', right: 'zdráhavý' },
        { left: 'eager', right: 'dychtivý' },
      ],
    },
  };
  it('all pairs → correct', () => {
    expect(evaluateAnswer(m, JSON.stringify({ reluctant: 'zdráhavý', eager: 'dychtivý' }))).toEqual({
      verdict: 'correct',
      reason: 'exact',
    });
  });
  it('some pairs → almost/partial_match', () => {
    expect(evaluateAnswer(m, JSON.stringify({ reluctant: 'zdráhavý', eager: 'zlý' }))).toEqual({
      verdict: 'almost',
      reason: 'partial_match',
    });
  });
  it('none → wrong', () => {
    expect(evaluateAnswer(m, JSON.stringify({ reluctant: 'x', eager: 'y' })).verdict).toBe('wrong');
  });
});
