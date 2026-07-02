import { z } from 'zod';

// ============================================================================
// Import contract — the interface between the app and a manual Claude chat that
// bulk-generates content. One envelope wraps a homogeneous items[]; `kind`
// selects which item schema applies. Validated on import (server-side).
// ============================================================================

const cefr = z.enum(['A2', 'B1', 'B2', 'C1']);
const nonEmpty = z.string().trim().min(1);

/* ---------------- exercise payloads ---------------- */

const vocabTranslatePayload = z
  .object({
    prompt: nonEmpty,
    prompt_lang: z.enum(['en', 'sk']),
    answer_lang: z.enum(['en', 'sk']),
    correct_answer: nonEmpty,
    acceptable_answers: z.array(nonEmpty).optional(),
  })
  .strict();

const fillBlankPayload = z
  .object({
    sentence: nonEmpty.refine((s) => (s.match(/___/g) ?? []).length === 1, {
      message: "sentence must contain the blank token '___' exactly once",
    }),
    correct_answer: nonEmpty,
    acceptable_answers: z.array(nonEmpty).optional(),
    hint: z.string().trim().optional(),
  })
  .strict();

const fixErrorPayload = z
  .object({
    sentence: nonEmpty,
    correct_answer: nonEmpty,
    acceptable_answers: z.array(nonEmpty).optional(),
    error_tag: z.string().trim().optional(),
  })
  .strict()
  .refine((p) => p.correct_answer !== p.sentence, {
    message: 'correct_answer must differ from the erroneous sentence',
    path: ['correct_answer'],
  });

const multipleChoicePayload = z
  .object({
    prompt: nonEmpty,
    options: z
      .array(nonEmpty)
      .min(3)
      .max(6)
      .refine((o) => new Set(o.map((s) => s.toLowerCase())).size === o.length, {
        message: 'options must be distinct',
      }),
    correct_index: z.number().int().nonnegative(),
  })
  .strict()
  .refine((p) => p.correct_index < p.options.length, {
    message: 'correct_index out of range',
    path: ['correct_index'],
  });

const matchingPayload = z
  .object({
    pairs: z
      .array(z.object({ left: nonEmpty, right: nonEmpty }).strict())
      .min(3)
      .max(8)
      .refine((ps) => new Set(ps.map((p) => p.left.toLowerCase())).size === ps.length, {
        message: 'left sides must be distinct',
      })
      .refine((ps) => new Set(ps.map((p) => p.right.toLowerCase())).size === ps.length, {
        message: 'right sides must be distinct',
      }),
  })
  .strict();

/* ---------------- exercise base + discriminated union ---------------- */

const exerciseBase = {
  cefr_level: cefr,
  related_word_terms: z.array(nonEmpty).optional(),
  related_topic_name: nonEmpty.optional(),
  note: z.string().trim().optional(),
};

export const exerciseItemSchema = z.discriminatedUnion('type', [
  z.object({ ...exerciseBase, type: z.literal('vocab_en_sk'), payload: vocabTranslatePayload }),
  z.object({ ...exerciseBase, type: z.literal('vocab_sk_en'), payload: vocabTranslatePayload }),
  z.object({ ...exerciseBase, type: z.literal('vocab_fill_blank'), payload: fillBlankPayload }),
  z.object({ ...exerciseBase, type: z.literal('vocab_multiple_choice'), payload: multipleChoicePayload }),
  z.object({ ...exerciseBase, type: z.literal('vocab_matching'), payload: matchingPayload }),
  z.object({ ...exerciseBase, type: z.literal('grammar_fill_form'), payload: fillBlankPayload }),
  z.object({ ...exerciseBase, type: z.literal('grammar_choose_option'), payload: multipleChoicePayload }),
  z.object({ ...exerciseBase, type: z.literal('grammar_fix_error'), payload: fixErrorPayload }),
]);

/* ---------------- words / topics ---------------- */

export const wordItemSchema = z
  .object({
    term: nonEmpty,
    translation: nonEmpty,
    part_of_speech: z.enum([
      'noun',
      'verb',
      'adjective',
      'adverb',
      'phrase',
      'phrasal_verb',
      'idiom',
      'other',
    ]),
    cefr_level: cefr,
    example_sentence: nonEmpty.nullish(),
    note: z.string().trim().optional(),
  })
  .strict();

export const grammarTopicItemSchema = z
  .object({
    name: nonEmpty,
    cefr_level: cefr,
    notes: nonEmpty,
    examples: z.array(nonEmpty).optional(),
  })
  .strict();

/* ---------------- envelope ---------------- */

const envelope = <T extends z.ZodTypeAny>(kind: string, item: T) =>
  z
    .object({
      schema_version: z.literal(1),
      kind: z.literal(kind),
      source_batch: nonEmpty.max(120),
      generated_at: z.string().optional(),
      items: z.array(item).min(1).max(2000),
    })
    .strict();

export const exercisesEnvelopeSchema = envelope('exercises', exerciseItemSchema);
export const wordsEnvelopeSchema = envelope('words', wordItemSchema);
export const grammarTopicsEnvelopeSchema = envelope('grammar_topics', grammarTopicItemSchema);

export type ExerciseItem = z.infer<typeof exerciseItemSchema>;
export type WordItem = z.infer<typeof wordItemSchema>;
export type GrammarTopicItem = z.infer<typeof grammarTopicItemSchema>;
export type ExercisesEnvelope = z.infer<typeof exercisesEnvelopeSchema>;
export type WordsEnvelope = z.infer<typeof wordsEnvelopeSchema>;
export type GrammarTopicsEnvelope = z.infer<typeof grammarTopicsEnvelopeSchema>;

export type ParsedImport =
  | { kind: 'exercises'; data: ExercisesEnvelope }
  | { kind: 'words'; data: WordsEnvelope }
  | { kind: 'grammar_topics'; data: GrammarTopicsEnvelope };

/** Peek at `kind`, then validate with the matching envelope schema. Throws ZodError. */
export function parseImport(raw: unknown): ParsedImport {
  const { kind } = z.object({ kind: z.enum(['exercises', 'words', 'grammar_topics']) }).parse(raw);
  switch (kind) {
    case 'exercises':
      return { kind, data: exercisesEnvelopeSchema.parse(raw) };
    case 'words':
      return { kind, data: wordsEnvelopeSchema.parse(raw) };
    case 'grammar_topics':
      return { kind, data: grammarTopicsEnvelopeSchema.parse(raw) };
  }
}
