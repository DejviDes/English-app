'use server';

import { createServerClient } from '@/lib/supabase/server';
import { assertGate } from '@/lib/gate';
import { DICT_PAGE, type DictRow } from '@/lib/dictionary';

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
    .select('id,term,translation,theme,cefr_level,part_of_speech', { count: 'exact' })
    .order('term', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + DICT_PAGE - 1);

  if (clean) query = query.or(`term.ilike.%${clean}%,translation.ilike.%${clean}%`);

  const { data, count } = await query;
  const rows: DictRow[] = (data ?? []).map((w) => ({
    id: w.id as string,
    term: w.term as string,
    translation: w.translation as string,
    theme: (w.theme as string | null) ?? null,
    cefr: (w.cefr_level as string | null) ?? null,
    pos: w.part_of_speech as string,
  }));
  return { rows, total: count ?? 0 };
}
