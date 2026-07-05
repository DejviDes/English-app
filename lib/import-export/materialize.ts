import { exerciseContentHash } from './dedup';

export interface MaterializedExercise {
  type: string;
  payload: Record<string, unknown>;
  correct_answer: string | null;
  acceptable_answers: string[];
  cefr_level: string | null;
  primary_word_id: string;
  content_hash: string;
}

export interface MaterializableWord {
  id: string;
  term: string;
  translation: string;
  cefr_level: string | null;
  options?: string[] | null;
}

/**
 * Turn a word into its drill questions: EN→SK, SK→EN, and (when options are
 * present) a multiple-choice question. This is why importing a WORD is enough
 * to start drilling — the app builds the exercises.
 */
export function materializeWordExercises(word: MaterializableWord): MaterializedExercise[] {
  const term = word.term.trim();
  const translation = word.translation.trim();
  const cefr = word.cefr_level;
  const out: MaterializedExercise[] = [];

  const push = (type: string, payload: Record<string, unknown>, correct: string | null) =>
    out.push({
      type,
      payload,
      correct_answer: correct,
      acceptable_answers: [],
      cefr_level: cefr,
      primary_word_id: word.id,
      content_hash: exerciseContentHash(type, correct, payload),
    });

  // Only a multiple-choice question is auto-created (typed EN↔SK drills were removed —
  // slow/imprecise to type; vocabulary is learned via the flashcard levels instead).
  // Multiple choice from options — needs distinct options incl. the correct one.
  let opts = [...new Set((word.options ?? []).map((o) => o.trim()).filter(Boolean))];
  if (opts.length > 6) {
    const others = opts.filter((o) => o.toLowerCase() !== translation.toLowerCase()).slice(0, 5);
    opts = [translation, ...others];
  }
  const idx = opts.findIndex((o) => o.toLowerCase() === translation.toLowerCase());
  if (idx >= 0 && opts.length >= 3 && opts.length <= 6) {
    push('vocab_multiple_choice', { prompt: term, options: opts, correct_index: idx }, opts[idx]);
  }

  return out;
}
