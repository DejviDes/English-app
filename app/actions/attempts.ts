'use server';

import { randomUUID } from 'node:crypto';
import { createServerClient } from '@/lib/supabase/server';
import { assertGate } from '@/lib/gate';
import { evaluateAnswer } from '@/lib/eval/evaluate';
import type { ChoicePayload, MatchingPayload, EvaluableExercise } from '@/lib/eval/types';
import { NEW_ITEM_STATE, updateSM2, verdictToQuality, type SM2State } from '@/lib/sm2/sm2';

export interface SubmitResult {
  verdict: 'correct' | 'almost' | 'wrong';
  reason: string;
  correctAnswer: string;
  nextDueDate: string;
}

/** Human-readable "correct answer" to reveal after submitting. */
function revealAnswer(ex: { type: string; correct_answer: string | null; payload: unknown }): string {
  if (ex.type === 'vocab_matching') {
    const pairs = (ex.payload as MatchingPayload)?.pairs ?? [];
    return pairs.map((p) => `${p.left} → ${p.right}`).join(', ');
  }
  if (ex.type === 'vocab_multiple_choice' || ex.type === 'grammar_choose_option') {
    const p = ex.payload as ChoicePayload;
    return p?.options?.[p?.correct_index] ?? ex.correct_answer ?? '';
  }
  return ex.correct_answer ?? '';
}

/** Core: evaluate → SM-2 → persist atomically. `attemptId` makes it idempotent. */
async function persistAnswer(
  attemptId: string,
  exerciseId: string,
  userAnswer: string,
): Promise<SubmitResult> {
  const supabase = createServerClient();

  const { data: ex, error: exErr } = await supabase
    .from('exercises')
    .select('id,type,correct_answer,acceptable_answers,payload,primary_word_id,related_topic_id')
    .eq('id', exerciseId)
    .single();
  if (exErr || !ex) throw new Error('exercise_not_found');

  const evaluable: EvaluableExercise = {
    type: ex.type,
    correct_answer: ex.correct_answer,
    acceptable_answers: ex.acceptable_answers,
    payload: ex.payload,
  };
  const { verdict, reason } = evaluateAnswer(evaluable, userAnswer);
  const quality = verdictToQuality(verdict);

  const target = ex.related_topic_id
    ? { table: 'grammar_topics' as const, id: ex.related_topic_id as string }
    : { table: 'words' as const, id: ex.primary_word_id as string };

  const { data: item } = await supabase
    .from(target.table)
    .select('ease_factor,interval_days,repetitions')
    .eq('id', target.id)
    .single();
  const state: SM2State = item ?? NEW_ITEM_STATE;
  const next = updateSM2(state, quality, new Date());

  const { error: rpcErr } = await supabase.rpc('record_attempt', {
    p_attempt_id: attemptId,
    p_exercise_id: ex.id,
    p_user_answer: userAnswer,
    p_verdict: verdict,
    p_eval_reason: reason,
    p_quality: quality,
    p_target_table: target.table,
    p_target_id: target.id,
    p_ease_factor: next.ease_factor,
    p_interval_days: next.interval_days,
    p_repetitions: next.repetitions,
    p_due_date: next.due_date,
    p_last_reviewed: new Date().toISOString(),
  });
  if (rpcErr) throw rpcErr;

  return { verdict, reason, correctAnswer: revealAnswer(ex), nextDueDate: next.due_date };
}

/** Online submit (also used with a client-provided id so retries are idempotent). */
export async function submitAttempt(
  exerciseId: string,
  userAnswer: string,
  attemptId?: string,
): Promise<SubmitResult> {
  await assertGate();
  return persistAnswer(attemptId ?? randomUUID(), exerciseId, userAnswer);
}

export interface QueuedAttempt {
  attemptId: string;
  exerciseId: string;
  userAnswer: string;
}

/** Replay a batch of offline-queued attempts, in order. Idempotent per attemptId. */
export async function flushAttempts(
  items: QueuedAttempt[],
): Promise<{ ok: boolean; synced: number; error?: string }> {
  await assertGate();
  let synced = 0;
  try {
    for (const it of items) {
      await persistAnswer(it.attemptId, it.exerciseId, it.userAnswer);
      synced++;
    }
    return { ok: true, synced };
  } catch (e) {
    return { ok: false, synced, error: e instanceof Error ? e.message : 'flush_failed' };
  }
}
