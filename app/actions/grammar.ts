'use server';

import { createServerClient } from '@/lib/supabase/server';
import { assertGate } from '@/lib/gate';

/** Mark a grammar level completed with its score. Attempts (SM-2) are logged separately
 *  per answer via submitAttempt; this just records level completion for the map. */
export async function completeGrammarLevel(
  levelId: string,
  correct: number,
  total: number,
): Promise<{ ok: boolean }> {
  await assertGate();
  const supabase = createServerClient();
  const { error } = await supabase
    .from('grammar_progress')
    .upsert(
      { level_id: levelId, completed: true, correct, total, updated_at: new Date().toISOString() },
      { onConflict: 'level_id' },
    );
  return { ok: !error };
}
