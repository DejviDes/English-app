// Shared types for the pure evaluation engine. No DB, no React — importable
// on server, client, and in the offline worker alike.

export type Verdict = 'correct' | 'almost' | 'wrong';

export type ExerciseType =
  | 'vocab_en_sk'          // show EN term, type SK translation   (open)
  | 'vocab_sk_en'          // show SK term, type EN translation   (open)
  | 'vocab_fill_blank'     // sentence with ___, type missing word (open)
  | 'vocab_multiple_choice'// pick one option                     (deterministic)
  | 'vocab_matching'       // match EN<->SK pairs                  (deterministic)
  | 'grammar_fill_form'    // put verb/word in correct form        (open)
  | 'grammar_choose_option'// choose correct option (grammar MC)   (deterministic)
  | 'grammar_fix_error';   // rewrite sentence fixing one error    (open)

export type EvalReason =
  | 'exact'
  | 'normalized'
  | 'accepted_variant'
  | 'typo'
  | 'missing_article'
  | 'wrong_option'
  | 'partial_match'   // matching: some but not all pairs correct
  | 'empty'
  | 'mismatch';

export interface EvalResult {
  verdict: Verdict;
  reason: EvalReason;
}

// Payload shapes the evaluator reads (a subset of the Zod-validated import payload).
export interface OpenPayload {
  prompt?: string;
  sentence?: string;
  hint?: string;
  correct_answer?: string;
  acceptable_answers?: string[];
}
export interface ChoicePayload {
  prompt: string;
  options: string[];
  correct_index: number;
}
export interface MatchingPayload {
  pairs: { left: string; right: string }[];
}
export type ExercisePayload = OpenPayload | ChoicePayload | MatchingPayload;

// The minimal shape the evaluator needs — deliberately NOT the DB row, to keep
// the evaluator decoupled from persistence.
export interface EvaluableExercise {
  type: ExerciseType;
  correct_answer: string | null;
  acceptable_answers?: string[] | null;
  payload: ExercisePayload;
}

export const OPEN_TYPES: ReadonlySet<ExerciseType> = new Set<ExerciseType>([
  'vocab_en_sk',
  'vocab_sk_en',
  'vocab_fill_blank',
  'grammar_fill_form',
  'grammar_fix_error',
]);

export const CHOICE_TYPES: ReadonlySet<ExerciseType> = new Set<ExerciseType>([
  'vocab_multiple_choice',
  'grammar_choose_option',
]);
