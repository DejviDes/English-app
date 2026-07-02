'use server';

import { createServerClient } from '@/lib/supabase/server';
import { assertGate } from '@/lib/gate';

export interface ExportFilters {
  from?: string; // 'YYYY-MM-DD' inclusive
  to?: string; // 'YYYY-MM-DD' inclusive
  only_wrong?: boolean; // includes 'wrong' AND 'almost'
}

export interface AttemptExportRow {
  attempt_id: string;
  created_at: string;
  exercise_id: string | null;
  exercise_type: string | null;
  prompt: string;
  expected: string;
  user_answer: string;
  verdict: string;
  quality: number;
  eval_reason: string | null;
  target_word: string | null;
  target_topic: string | null;
}

export interface AttemptsExport {
  schema_version: 1;
  kind: 'attempts_export';
  exported_at: string;
  filters: ExportFilters;
  summary: {
    total: number;
    correct: number;
    almost: number;
    wrong: number;
    by_reason: Record<string, number>;
  };
  rows: AttemptExportRow[];
}

type ExRel = {
  id: string;
  type: string;
  correct_answer: string | null;
  payload: { prompt?: string; sentence?: string; options?: string[]; correct_index?: number; pairs?: { left: string; right: string }[] } | null;
} | null;

function expectedOf(ex: ExRel): string {
  if (!ex) return '';
  if (ex.type === 'vocab_matching') {
    return (ex.payload?.pairs ?? []).map((p) => `${p.left} → ${p.right}`).join(', ');
  }
  if (ex.correct_answer) return ex.correct_answer;
  if (ex.payload?.options && ex.payload.correct_index != null) {
    return ex.payload.options[ex.payload.correct_index] ?? '';
  }
  return '';
}

export async function exportAttempts(filters: ExportFilters): Promise<AttemptsExport> {
  await assertGate();
  const supabase = createServerClient();

  let q = supabase
    .from('attempts')
    .select(
      `id, created_at, user_answer, verdict, quality, eval_reason,
       exercise:exercises ( id, type, correct_answer, payload ),
       word:words ( term ),
       topic:grammar_topics ( name )`,
    )
    .order('created_at', { ascending: true });

  if (filters.from) q = q.gte('created_at', `${filters.from}T00:00:00.000Z`);
  if (filters.to) q = q.lte('created_at', `${filters.to}T23:59:59.999Z`);
  if (filters.only_wrong) q = q.neq('verdict', 'correct');

  const { data, error } = await q;
  if (error) throw error;

  const rows: AttemptExportRow[] = (data ?? []).map((a) => {
    const ex = (a.exercise as unknown as ExRel) ?? null;
    const word = a.word as unknown as { term: string } | null;
    const topic = a.topic as unknown as { name: string } | null;
    return {
      attempt_id: a.id as string,
      created_at: a.created_at as string,
      exercise_id: ex?.id ?? null,
      exercise_type: ex?.type ?? null,
      prompt: ex?.payload?.prompt ?? ex?.payload?.sentence ?? '',
      expected: expectedOf(ex),
      user_answer: a.user_answer as string,
      verdict: a.verdict as string,
      quality: a.quality as number,
      eval_reason: (a.eval_reason as string | null) ?? null,
      target_word: word?.term ?? null,
      target_topic: topic?.name ?? null,
    };
  });

  const by_reason: Record<string, number> = {};
  let correct = 0;
  let almost = 0;
  let wrong = 0;
  for (const r of rows) {
    if (r.verdict === 'correct') correct++;
    else if (r.verdict === 'almost') almost++;
    else wrong++;
    const reason = r.eval_reason ?? 'unknown';
    by_reason[reason] = (by_reason[reason] ?? 0) + 1;
  }

  return {
    schema_version: 1,
    kind: 'attempts_export',
    exported_at: new Date().toISOString(),
    filters,
    summary: { total: rows.length, correct, almost, wrong, by_reason },
    rows,
  };
}
