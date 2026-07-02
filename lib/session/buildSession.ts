import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase/server';
import { toISODate } from '@/lib/sm2/sm2';
import type { ExerciseType } from '@/lib/eval/types';

export const SESSION_SIZE = 20;

export type Bucket = 'due' | 'new' | 'weak';
export type ItemKind = 'word' | 'topic';

export interface SrsRow {
  id: string;
  kind: ItemKind;
  ease_factor: number;
  due_date: string;
  last_reviewed: string | null;
  created_at: string;
}

export interface QueuedItem {
  itemId: string;
  kind: ItemKind;
  bucket: Bucket;
}

export interface SessionExercise {
  exerciseId: string;
  type: ExerciseType;
  payload: unknown;
  itemId: string;
  kind: ItemKind;
  bucket: Bucket;
}

const SELECT = 'id,kind,ease_factor,due_date,last_reviewed,created_at';

/** Pure merge: due first, then new, then weak; dedupe by (kind,id); cap. */
export function mergeBuckets(due: SrsRow[], fresh: SrsRow[], weak: SrsRow[], cap: number): QueuedItem[] {
  const seen = new Set<string>();
  const out: QueuedItem[] = [];
  const push = (rows: SrsRow[], bucket: Bucket) => {
    for (const r of rows) {
      if (out.length >= cap) return;
      const key = `${r.kind}:${r.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ itemId: r.id, kind: r.kind, bucket });
    }
  };
  push(due, 'due');
  push(fresh, 'new');
  push(weak, 'weak');
  return out;
}

/** For each queued item, pick its least-used exercise (used ones may re-drill). */
async function attachExercises(supabase: SupabaseClient, items: QueuedItem[]): Promise<SessionExercise[]> {
  const out: SessionExercise[] = [];
  for (const it of items) {
    let q = supabase
      .from('exercises')
      .select('id,type,payload')
      .order('times_used', { ascending: true })
      .order('last_used_at', { ascending: true, nullsFirst: true })
      .limit(1);
    q = it.kind === 'word' ? q.eq('primary_word_id', it.itemId) : q.eq('related_topic_id', it.itemId);
    const { data } = await q;
    const ex = data?.[0];
    if (ex) {
      out.push({
        exerciseId: ex.id,
        type: ex.type,
        payload: ex.payload,
        itemId: it.itemId,
        kind: it.kind,
        bucket: it.bucket,
      });
    }
    // else: item has no exercise yet → dropped (dashboard surfaces the gap).
  }
  return out;
}

/** Build the deterministic session queue (due + new + weak → one exercise each). */
export async function buildSession(cap: number = SESSION_SIZE): Promise<SessionExercise[]> {
  const supabase = createServerClient();
  const today = toISODate(new Date());

  const [dueQ, newQ, weakQ] = await Promise.all([
    supabase
      .from('srs_items')
      .select(SELECT)
      .gt('repetitions', 0)
      .lte('due_date', today)
      .order('due_date', { ascending: true })
      .order('last_reviewed', { ascending: true })
      .order('kind', { ascending: true })
      .limit(cap),
    supabase
      .from('srs_items')
      .select(SELECT)
      .is('last_reviewed', null)
      .order('created_at', { ascending: true })
      .order('kind', { ascending: true })
      .limit(cap),
    supabase
      .from('srs_items')
      .select(SELECT)
      .gt('repetitions', 0)
      .lt('ease_factor', 2.0)
      .gt('due_date', today)
      .order('ease_factor', { ascending: true })
      .limit(cap),
  ]);

  const items = mergeBuckets(
    (dueQ.data as SrsRow[]) ?? [],
    (newQ.data as SrsRow[]) ?? [],
    (weakQ.data as SrsRow[]) ?? [],
    cap,
  );
  return attachExercises(supabase, items);
}
