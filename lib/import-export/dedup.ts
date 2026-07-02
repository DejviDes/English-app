import { createHash } from 'node:crypto';
import type { ExerciseItem } from '@/lib/schemas/import';

const US = ''; // unit separator (won't appear in real content)

/** Normalize a term/name to its dedup form. */
export function normalizeKey(s: string): string {
  return s.trim().toLowerCase();
}

/** words dedup key = lower(trim(term)) | part_of_speech. */
export function wordContentKey(term: string, partOfSpeech: string): string {
  return `${normalizeKey(term)}|${partOfSpeech}`;
}

/** grammar_topics dedup key = lower(trim(name)). */
export function topicContentKey(name: string): string {
  return normalizeKey(name);
}

/** exercises dedup hash = sha1(type | correct_answer | JSON(payload)). */
export function exerciseContentHash(
  type: string,
  correctAnswer: string | null,
  payload: unknown,
): string {
  return createHash('sha1')
    .update(`${type}${US}${correctAnswer ?? ''}${US}${JSON.stringify(payload)}`)
    .digest('hex');
}

/** Derive the scalar correct_answer / acceptable_answers columns from a payload. */
export function deriveAnswerColumns(item: ExerciseItem): {
  correct_answer: string | null;
  acceptable_answers: string[];
} {
  switch (item.type) {
    case 'vocab_multiple_choice':
    case 'grammar_choose_option': {
      const p = item.payload;
      return { correct_answer: p.options[p.correct_index] ?? null, acceptable_answers: [] };
    }
    case 'vocab_matching':
      return { correct_answer: null, acceptable_answers: [] };
    default: {
      const p = item.payload;
      return { correct_answer: p.correct_answer, acceptable_answers: p.acceptable_answers ?? [] };
    }
  }
}
