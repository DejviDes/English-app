'use server';

import { createServerClient } from '@/lib/supabase/server';
import { assertGate } from '@/lib/gate';

/** Record that the learner finished phase `phase` (1=MC, 2=EN→SK, 3=SK→EN) of a day.
 *  Monotonic: never lowers an already-higher phase. Phase 3 completes the day. */
export async function markDayPhase(day: number, phase: number): Promise<{ ok: boolean }> {
  await assertGate();
  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from('day_progress')
    .select('phase')
    .eq('day', day)
    .maybeSingle();

  const newPhase = Math.max((existing?.phase as number | undefined) ?? 0, phase);
  const { error } = await supabase.from('day_progress').upsert(
    {
      day,
      phase: newPhase,
      completed_at: newPhase >= 3 ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'day' },
  );
  return { ok: !error };
}

export async function markDayReviewed(day: number): Promise<{ ok: boolean }> {
  await assertGate();
  const supabase = createServerClient();
  const { data: existing } = await supabase
    .from('day_progress')
    .select('phase')
    .eq('day', day)
    .maybeSingle();
  const { error } = await supabase.from('day_progress').upsert(
    {
      day,
      phase: Math.max((existing?.phase as number | undefined) ?? 0, 0),
      reviewed: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'day' },
  );
  return { ok: !error };
}

export async function markWeekReviewed(week: number): Promise<{ ok: boolean }> {
  await assertGate();
  const supabase = createServerClient();
  const { error } = await supabase
    .from('week_progress')
    .upsert({ week, reviewed: true, updated_at: new Date().toISOString() }, { onConflict: 'week' });
  return { ok: !error };
}
