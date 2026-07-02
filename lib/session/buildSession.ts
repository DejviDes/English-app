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

interface ExerciseRow {
  id: string;
  type: ExerciseType;
  payload: unknown;
  primary_word_id: string | null;
  related_topic_id: string | null;
  times_used: number | null;
  last_used_at: string | null;
}

/** Least-used first, then least-recently-used (nulls first). */
function leastUsed(a: ExerciseRow, b: ExerciseRow): number {
  const tu = (a.times_used ?? 0) - (b.times_used ?? 0);
  if (tu !== 0) return tu;
  const at = a.last_used_at ?? '';
  const bt = b.last_used_at ?? '';
  return at < bt ? -1 : at > bt ? 1 : 0;
}

/**
 * Attach one exercise per queued item. Single batched query for ALL items
 * (was N+1 — one round-trip per item), then group + pick in memory.
 */
async function attachExercises(supabase: SupabaseClient, items: QueuedItem[]): Promise<SessionExercise[]> {
  if (items.length === 0) return [];

  const wordIds = items.filter((i) => i.kind === 'word').map((i) => i.itemId);
  const topicIds = items.filter((i) => i.kind === 'topic').map((i) => i.itemId);

  const orParts: string[] = [];
  if (wordIds.length) orParts.push(`primary_word_id.in.(${wordIds.join(',')})`);
  if (topicIds.length) orParts.push(`related_topic_id.in.(${topicIds.join(',')})`);
  if (orParts.length === 0) return [];

  const { data } = await supabase
    .from('exercises')
    .select('id,type,payload,primary_word_id,related_topic_id,times_used,last_used_at')
    .or(orParts.join(','));

  const byWord = new Map<string, ExerciseRow[]>();
  const byTopic = new Map<string, ExerciseRow[]>();
  for (const ex of (data as ExerciseRow[]) ?? []) {
    if (ex.primary_word_id) {
      const arr = byWord.get(ex.primary_word_id) ?? [];
      arr.push(ex);
      byWord.set(ex.primary_word_id, arr);
    } else if (ex.related_topic_id) {
      const arr = byTopic.get(ex.related_topic_id) ?? [];
      arr.push(ex);
      byTopic.set(ex.related_topic_id, arr);
    }
  }

  const out: SessionExercise[] = [];
  for (const it of items) {
    const pool = it.kind === 'word' ? byWord.get(it.itemId) : byTopic.get(it.itemId);
    if (!pool || pool.length === 0) continue; // no exercise yet → dropped
    const ex = [...pool].sort(leastUsed)[0];
    out.push({ exerciseId: ex.id, type: ex.type, payload: ex.payload, itemId: it.itemId, kind: it.kind, bucket: it.bucket });
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
