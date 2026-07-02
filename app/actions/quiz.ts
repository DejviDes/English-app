'use server';

import { createServerClient } from '@/lib/supabase/server';
import { assertGate } from '@/lib/gate';
import { quizScore, type QuizCounts } from '@/lib/quiz';

export async function saveQuizSession(counts: QuizCounts): Promise<{ ok: boolean; score: number }> {
  await assertGate();
  const total = counts.correct + counts.almost + counts.wrong;
  if (total === 0) return { ok: true, score: 0 };
  const score = quizScore(counts);
  const supabase = createServerClient();
  const { error } = await supabase.from('quiz_sessions').insert({
    total,
    correct: counts.correct,
    almost: counts.almost,
    wrong: counts.wrong,
    score_pct: score,
  });
  return { ok: !error, score };
}
