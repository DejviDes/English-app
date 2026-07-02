// The pure answer evaluator. No AI, no DB. Dispatches by exercise type; open
// answers run through a fixed comparison ladder and take the best verdict found.
import {
  CHOICE_TYPES,
  OPEN_TYPES,
  type ChoicePayload,
  type EvalResult,
  type EvaluableExercise,
  type MatchingPayload,
  type Verdict,
} from './types';
import { foldDiacritics, normalize } from './normalize';
import { levenshtein, typoThreshold } from './levenshtein';
import { differsOnlyByArticle } from './articles';

const RANK: Record<Verdict, number> = { wrong: 0, almost: 1, correct: 2 };
const better = (a: EvalResult, b: EvalResult): EvalResult =>
  RANK[b.verdict] > RANK[a.verdict] ? b : a;

/** Compare a user answer against ONE candidate answer via the ladder. */
function compareOne(user: string, candidate: string, isAcceptable: boolean): EvalResult {
  if (user === candidate) {
    return { verdict: 'correct', reason: isAcceptable ? 'accepted_variant' : 'exact' };
  }

  const u = normalize(user);
  const c = normalize(candidate);

  if (u === c) {
    return { verdict: 'correct', reason: isAcceptable ? 'accepted_variant' : 'normalized' };
  }
  if (foldDiacritics(u) === foldDiacritics(c)) {
    return { verdict: 'almost', reason: 'typo' }; // right word, missed accents
  }
  if (differsOnlyByArticle(u, c)) {
    return { verdict: 'almost', reason: 'missing_article' };
  }
  if (levenshtein(u, c) <= typoThreshold(c.length)) {
    return { verdict: 'almost', reason: 'typo' };
  }
  return { verdict: 'wrong', reason: 'mismatch' };
}

function evaluateOpen(ex: EvaluableExercise, userAnswer: string): EvalResult {
  if (!userAnswer.trim()) return { verdict: 'wrong', reason: 'empty' };

  const candidates: { text: string; acceptable: boolean }[] = [];
  if (ex.correct_answer) candidates.push({ text: ex.correct_answer, acceptable: false });
  for (const t of ex.acceptable_answers ?? []) candidates.push({ text: t, acceptable: true });

  let best: EvalResult = { verdict: 'wrong', reason: 'mismatch' };
  for (const cand of candidates) {
    best = better(best, compareOne(userAnswer, cand.text, cand.acceptable));
    if (best.verdict === 'correct') break; // can't do better
  }
  return best;
}

/** Deterministic single-choice: compare the chosen option text to the correct
 *  option (payload.options[correct_index]). Options are distinct (Zod-enforced),
 *  so text comparison is unambiguous and keeps attempts.user_answer readable. */
function evaluateChoice(ex: EvaluableExercise, userAnswer: string): EvalResult {
  if (!userAnswer.trim()) return { verdict: 'wrong', reason: 'empty' };
  const p = ex.payload as ChoicePayload;
  const correct = p?.options?.[p?.correct_index] ?? ex.correct_answer ?? '';
  return normalize(userAnswer) === normalize(correct)
    ? { verdict: 'correct', reason: 'exact' }
    : { verdict: 'wrong', reason: 'wrong_option' };
}

/** Matching: userAnswer is a JSON string of { [left]: right } the user paired.
 *  All pairs right → correct; some → almost/partial_match; none → wrong. */
function evaluateMatching(ex: EvaluableExercise, userAnswer: string): EvalResult {
  const pairs = (ex.payload as MatchingPayload)?.pairs ?? [];
  if (pairs.length === 0) return { verdict: 'wrong', reason: 'mismatch' };

  let userMap: Record<string, string>;
  try {
    userMap = JSON.parse(userAnswer);
  } catch {
    return { verdict: 'wrong', reason: 'mismatch' };
  }

  let hits = 0;
  for (const { left, right } of pairs) {
    const chosen = userMap[left];
    if (chosen != null && normalize(chosen) === normalize(right)) hits++;
  }
  if (hits === pairs.length) return { verdict: 'correct', reason: 'exact' };
  if (hits > 0) return { verdict: 'almost', reason: 'partial_match' };
  return { verdict: 'wrong', reason: 'mismatch' };
}

/** MAIN EXPORT — pure. */
export function evaluateAnswer(ex: EvaluableExercise, userAnswer: string): EvalResult {
  if (ex.type === 'vocab_matching') return evaluateMatching(ex, userAnswer);
  if (CHOICE_TYPES.has(ex.type)) return evaluateChoice(ex, userAnswer);
  if (OPEN_TYPES.has(ex.type)) return evaluateOpen(ex, userAnswer);
  return { verdict: 'wrong', reason: 'mismatch' };
}
