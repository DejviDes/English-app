'use server';

import { createServerClient } from '@/lib/supabase/server';
import { assertGate } from '@/lib/gate';
import { DICT_PAGE, type DictRow, type WordStatus } from '@/lib/dictionary';

export type DictStatusFilter = 'all' | 'known' | 'unknown';

export async function searchWords({
  q,
  offset,
  status = 'all',
  cefr = 'all',
}: {
  q: string;
  offset: number;
  status?: DictStatusFilter;
  cefr?: string;
}): Promise<{ rows: DictRow[]; total: number }> {
  await assertGate();
  const supabase = createServerClient();

  // Strip characters that would break the PostgREST or() filter string.
  const clean = q.replace(/[%,()*\\]/g, ' ').trim();

  let query = supabase
    .from('words')
    .select('id,term,translation,ipa,theme,cefr_level,part_of_speech,known,lvl', { count: 'exact' })
    .order('term', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + DICT_PAGE - 1);

  if (clean) query = query.or(`term.ilike.%${clean}%,translation.ilike.%${clean}%`);
  if (status === 'known') query = query.eq('known', true);
  else if (status === 'unknown') query = query.eq('known', false);
  if (cefr !== 'all') query = query.eq('cefr_level', cefr);

  const [{ data, count }, { data: prog }] = await Promise.all([
    query,
    supabase.from('level_progress').select('n').eq('kind', 'level'),
  ]);

  const started = new Set((prog ?? []).map((p) => p.n as number));

  function statusOf(known: boolean, lvl: number | null): WordStatus {
    if (known) return 'known';
    if (lvl != null && started.has(lvl)) return 'learning';
    return 'new';
  }

  const rows: DictRow[] = (data ?? []).map((w) => ({
    id: w.id as string,
    term: w.term as string,
    translation: w.translation as string,
    ipa: (w.ipa as string | null) ?? null,
    theme: (w.theme as string | null) ?? null,
    cefr: (w.cefr_level as string | null) ?? null,
    pos: w.part_of_speech as string,
    status: statusOf((w.known as boolean) ?? false, (w.lvl as number | null) ?? null),
  }));
  return { rows, total: count ?? 0 };
}
