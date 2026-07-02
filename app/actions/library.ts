'use server';

import { createServerClient } from '@/lib/supabase/server';
import { assertGate } from '@/lib/gate';
import { LIBRARY_PAGE, type LibraryFilters, type LibraryRow } from '@/lib/repos/library';

type ExRel = {
  id: string;
  type: string;
  cefr_level: string | null;
  payload: { prompt?: string; sentence?: string; pairs?: { left: string }[] } | null;
  times_used: number | null;
  word: { term: string } | null;
  topic: { name: string } | null;
};

function labelOf(p: ExRel['payload']): string {
  if (p?.prompt) return p.prompt;
  if (p?.sentence) return p.sentence;
  if (p?.pairs) return p.pairs.map((x) => x.left).join(', ');
  return '(exercise)';
}

export async function getLibraryPage(
  filters: LibraryFilters,
): Promise<{ rows: LibraryRow[]; total: number }> {
  await assertGate();
  const supabase = createServerClient();

  let q = supabase
    .from('exercises')
    .select(
      'id,type,cefr_level,payload,times_used,word:words(term),topic:grammar_topics(name)',
      { count: 'exact' },
    )
    .order('imported_at', { ascending: false })
    .order('id', { ascending: true }) // stable tiebreaker → no overlap across pages
    .range(filters.offset, filters.offset + LIBRARY_PAGE - 1);

  if (filters.status === 'done') q = q.gt('times_used', 0);
  else if (filters.status === 'todo') q = q.eq('times_used', 0);
  if (filters.type !== 'all') q = q.eq('type', filters.type);

  const { data, count } = await q;
  const rows: LibraryRow[] = ((data as unknown as ExRel[]) ?? []).map((e) => ({
    id: e.id,
    type: e.type,
    cefr: e.cefr_level,
    label: labelOf(e.payload),
    target: e.word?.term ?? e.topic?.name ?? null,
    timesUsed: e.times_used ?? 0,
    done: (e.times_used ?? 0) > 0,
  }));
  return { rows, total: count ?? 0 };
}
