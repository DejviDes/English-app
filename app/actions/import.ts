'use server';

import { ZodError } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { assertGate } from '@/lib/gate';
import { parseImport, type ExerciseItem } from '@/lib/schemas/import';
import {
  deriveAnswerColumns,
  exerciseContentHash,
  normalizeKey,
  topicContentKey,
  wordContentKey,
} from '@/lib/import-export/dedup';

export interface ImportReport {
  ok: boolean;
  kind?: string;
  received?: number;
  inserted?: number;
  skipped_duplicates?: number;
  unresolved?: number;
  warnings?: string[];
  error?: string;
  issues?: { path: string; message: string }[];
}

function describeExercise(it: ExerciseItem): string {
  const p = it.payload as { prompt?: string; sentence?: string };
  return p.prompt ?? p.sentence ?? it.type;
}

/** De-dupe rows in-batch by a key, then upsert with ON CONFLICT DO NOTHING. */
async function insertUnique(
  table: string,
  rows: Record<string, unknown>[],
  keyOf: (r: Record<string, unknown>) => string,
  onConflict: string,
): Promise<{ unique: number; inserted: number; error?: string }> {
  const seen = new Set<string>();
  const unique = rows.filter((r) => {
    const k = keyOf(r);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (unique.length === 0) return { unique: 0, inserted: 0 };
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from(table)
    .upsert(unique, { onConflict, ignoreDuplicates: true })
    .select('id');
  if (error) return { unique: unique.length, inserted: 0, error: error.message };
  return { unique: unique.length, inserted: data?.length ?? 0 };
}

export async function importPayload(rawText: string): Promise<ImportReport> {
  await assertGate();

  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch {
    return { ok: false, error: 'Invalid JSON.' };
  }

  let parsed;
  try {
    parsed = parseImport(raw);
  } catch (e) {
    if (e instanceof ZodError) {
      return {
        ok: false,
        error: 'Validation failed.',
        issues: e.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      };
    }
    return { ok: false, error: 'Unrecognized file (missing or invalid "kind").' };
  }

  const received = parsed.data.items.length;
  const batch = parsed.data.source_batch;

  if (parsed.kind === 'words') {
    const rows = parsed.data.items.map((it) => ({
      term: it.term.trim(),
      translation: it.translation.trim(),
      part_of_speech: it.part_of_speech,
      cefr_level: it.cefr_level,
      example_sentence: it.example_sentence ?? null,
      source_batch: batch,
      content_key: wordContentKey(it.term, it.part_of_speech),
    }));
    const r = await insertUnique('words', rows, (x) => x.content_key as string, 'content_key');
    if (r.error) return { ok: false, error: r.error };
    return {
      ok: true,
      kind: parsed.kind,
      received,
      inserted: r.inserted,
      skipped_duplicates: received - r.inserted,
    };
  }

  if (parsed.kind === 'grammar_topics') {
    const rows = parsed.data.items.map((it) => ({
      name: it.name.trim(),
      cefr_level: it.cefr_level,
      notes: it.notes,
      source_batch: batch,
      content_key: topicContentKey(it.name),
    }));
    const r = await insertUnique('grammar_topics', rows, (x) => x.content_key as string, 'content_key');
    if (r.error) return { ok: false, error: r.error };
    return {
      ok: true,
      kind: parsed.kind,
      received,
      inserted: r.inserted,
      skipped_duplicates: received - r.inserted,
    };
  }

  // ---- exercises: resolve related terms/topic to ids ----
  const supabase = createServerClient();
  const warnings: string[] = [];
  const [{ data: words }, { data: topics }] = await Promise.all([
    supabase.from('words').select('id, term'),
    supabase.from('grammar_topics').select('id, name'),
  ]);
  const wordByKey = new Map((words ?? []).map((w) => [normalizeKey(w.term), w.id as string]));
  const topicByKey = new Map((topics ?? []).map((t) => [normalizeKey(t.name), t.id as string]));

  const rows: Record<string, unknown>[] = [];
  for (const it of parsed.data.items as ExerciseItem[]) {
    const { correct_answer, acceptable_answers } = deriveAnswerColumns(it);
    let primary_word_id: string | null = null;
    let related_topic_id: string | null = null;
    let related_word_ids: string[] = [];

    if (it.related_topic_name) {
      const id = topicByKey.get(normalizeKey(it.related_topic_name));
      if (id) related_topic_id = id;
      else warnings.push(`Topic not found: "${it.related_topic_name}".`);
    } else {
      const terms = it.related_word_terms ?? [];
      const ids = terms
        .map((t) => wordByKey.get(normalizeKey(t)))
        .filter((x): x is string => Boolean(x));
      for (const t of terms) if (!wordByKey.get(normalizeKey(t))) warnings.push(`Word not found: "${t}".`);
      if (ids.length > 0) {
        primary_word_id = ids[0];
        related_word_ids = ids.slice(1);
      }
    }

    if (!primary_word_id && !related_topic_id) {
      warnings.push(`Exercise "${describeExercise(it)}" has no resolvable target — skipped.`);
      continue;
    }

    rows.push({
      type: it.type,
      payload: it.payload,
      correct_answer,
      acceptable_answers,
      primary_word_id,
      related_topic_id,
      related_word_ids,
      source_batch: batch,
      content_hash: exerciseContentHash(it.type, correct_answer, it.payload),
    });
  }

  const unresolved = received - rows.length;
  const r = await insertUnique('exercises', rows, (x) => x.content_hash as string, 'content_hash');
  if (r.error) return { ok: false, error: r.error, warnings };
  return {
    ok: true,
    kind: 'exercises',
    received,
    inserted: r.inserted,
    skipped_duplicates: r.unique - r.inserted,
    unresolved,
    warnings,
  };
}
