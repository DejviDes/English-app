'use server';

import { createServerClient } from '@/lib/supabase/server';
import { assertGate } from '@/lib/gate';

export type Kind = 'level' | 'review';
export interface RemainingItem {
  id: string;
  r: 'almost' | 'didnt' | null;
}

/** Persist mid-level state so a level can be resumed after closing/crashing. */
export async function saveLevelState(
  kind: Kind,
  n: number,
  direction: number,
  remaining: RemainingItem[],
): Promise<{ ok: boolean }> {
  await assertGate();
  const supabase = createServerClient();
  const { error } = await supabase.from('level_progress').upsert(
    { kind, n, direction, remaining, completed: false, updated_at: new Date().toISOString() },
    { onConflict: 'kind,n' },
  );
  return { ok: !error };
}

/** Mark a level/review complete; for content levels, mark its words as known. */
export async function completeLevel(kind: Kind, n: number): Promise<{ ok: boolean }> {
  await assertGate();
  const supabase = createServerClient();
  const { error } = await supabase.from('level_progress').upsert(
    { kind, n, direction: 1, remaining: [], completed: true, updated_at: new Date().toISOString() },
    { onConflict: 'kind,n' },
  );
  if (!error && kind === 'level') {
    await supabase.from('words').update({ known: true }).eq('lvl', n);
  }
  return { ok: !error };
}
