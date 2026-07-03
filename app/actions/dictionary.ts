'use server';

import { createServerClient } from '@/lib/supabase/server';
import { assertGate } from '@/lib/gate';
import { DICT_PAGE, type DictRow, type WordStatus } from '@/lib/dictionary';

export async function searchWords({
  q,
  offset,
}: {
  q: string;
  offset: number;
}): Promise<{ rows: DictRow[]; total: number }> {
  await assertGate();
  const supabase = createServerClient();

  // Strip characters that would break the PostgREST or() filter string.
  const clean = q.replace(/[%,()*\\]/g, ' ').trim();

  let query = supabase
    .from('words')
    .select('id,term,translation,theme,cefr_level,part_of_speech,day,last_reviewed', { count: 'exact' })
    .order('term', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + DICT_PAGE - 1);

  if (clean) query = query.or(`term.ilike.%${clean}%,translation.ilike.%${clean}%`);

  const [{ data, count }, { data: prog }, { data: weeks }] = await Promise.all([
    query,
    supabase.from('day_progress').select('day,phase,reviewed'),
    supabase.from('week_progress').select('week,reviewed'),
  ]);

  const dayProg = new Map((prog ?? []).map((p) => [p.day as number, p]));
  const weekReviewed = new Map((weeks ?? []).map((w) => [w.week as number, w.reviewed as boolean]));

  function statusOf(day: number | null, lastReviewed: string | null): WordStatus {
    if (day != null) {
      if (weekReviewed.get(Math.ceil(day / 7))) return 'weekly';
      const dp = dayProg.get(day);
      if (dp?.reviewed) return 'review';
      if (((dp?.phase as number | undefined) ?? 0) >= 3) return 'daily';
    }
    return lastReviewed ? 'learning' : 'new';
  }

  const rows: DictRow[] = (data ?? []).map((w) => ({
    id: w.id as string,
    term: w.term as string,
    translation: w.translation as string,
    theme: (w.theme as string | null) ?? null,
    cefr: (w.cefr_level as string | null) ?? null,
    pos: w.part_of_speech as string,
    status: statusOf((w.day as number | null) ?? null, (w.last_reviewed as string | null) ?? null),
  }));
  return { rows, total: count ?? 0 };
}
