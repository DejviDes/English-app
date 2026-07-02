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
import { materializeWordExercises } from '@/lib/import-export/materialize';

export interface ImportReport {
  ok: boolean;
  kind?: string;
  received?: number;
  inserted?: number;
  skipped_duplicates?: number;
  unresolved?: number;
  exercises_created?: number;
  warnings?: string[];
  error?: string;
  issues?: { path: string; message: string }[];
}

const CHUNK = 500;

function dedupeByKey<T>(rows: T[], keyOf: (r: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    const k = keyOf(r);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

/** Chunked ON CONFLICT DO NOTHING insert; returns count actually inserted. */
async function insertIgnore(
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
): Promise<{ inserted: number; error?: string }> {
  if (rows.length === 0) return { inserted: 0 };
  const supabase = createServerClient();
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { data, error } = await supabase
      .from(table)
      .upsert(rows.slice(i, i + CHUNK), { onConflict, ignoreDuplicates: true })
      .select('id');
    if (error) return { inserted, error: error.message };
    inserted += data?.length ?? 0;
  }
  return { inserted };
}

function describeExercise(it: ExerciseItem): string {
  const p = it.payload as { prompt?: string; sentence?: string };
  return p.prompt ?? p.sentence ?? it.type;
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
  const supabase = createServerClient();

  // ---------------- WORDS (+ auto-materialized exercises) ----------------
  if (parsed.kind === 'words') {
    const wordRows = dedupeByKey(
      parsed.data.items.map((it) => ({
        term: it.term.trim(),
        translation: it.translation.trim(),
        part_of_speech: it.part_of_speech,
        cefr_level: it.cefr_level,
        example_sentence: it.example_sentence ?? null,
        theme: it.theme ?? null,
        options: it.options ?? [],
        source_batch: batch,
        content_key: wordContentKey(it.term, it.part_of_speech),
      })),
      (r) => r.content_key,
    );

    const w = await insertIgnore('words', wordRows, 'content_key');
    if (w.error) return { ok: false, error: w.error };

    // Resolve ids for ALL words in the batch (existing + new) to build exercises.
    const idByKey = new Map<string, string>();
    const keys = wordRows.map((r) => r.content_key);
    for (let i = 0; i < keys.length; i += CHUNK) {
      const { data } = await supabase
        .from('words')
        .select('id,content_key')
        .in('content_key', keys.slice(i, i + CHUNK));
      for (const row of data ?? []) idByKey.set(row.content_key as string, row.id as string);
    }

    const exRows: Record<string, unknown>[] = [];
    for (const r of wordRows) {
      const id = idByKey.get(r.content_key);
      if (!id) continue;
      for (const ex of materializeWordExercises({
        id,
        term: r.term,
        translation: r.translation,
        cefr_level: r.cefr_level,
        options: r.options,
      })) {
        exRows.push({ ...ex, source_batch: batch });
      }
    }
    const exUnique = dedupeByKey(exRows, (r) => r.content_hash as string);
    const ex = await insertIgnore('exercises', exUnique, 'content_hash');
    if (ex.error) return { ok: false, error: ex.error };

    return {
      ok: true,
      kind: parsed.kind,
      received,
      inserted: w.inserted,
      skipped_duplicates: received - w.inserted,
      exercises_created: ex.inserted,
    };
  }

  // ---------------- GRAMMAR TOPICS ----------------
  if (parsed.kind === 'grammar_topics') {
    const rows = dedupeByKey(
      parsed.data.items.map((it) => ({
        name: it.name.trim(),
        cefr_level: it.cefr_level,
        notes: it.notes,
        source_batch: batch,
        content_key: topicContentKey(it.name),
      })),
      (r) => r.content_key,
    );
    const r = await insertIgnore('grammar_topics', rows, 'content_key');
    if (r.error) return { ok: false, error: r.error };
    return { ok: true, kind: parsed.kind, received, inserted: r.inserted, skipped_duplicates: received - r.inserted };
  }

  // ---------------- EXERCISES (imported directly) ----------------
  const warnings: string[] = [];
  const [{ data: words }, { data: topics }] = await Promise.all([
    supabase.from('words').select('id, term'),
    supabase.from('grammar_topics').select('id, name'),
  ]);
  const wordByKey = new Map((words ?? []).map((x) => [normalizeKey(x.term), x.id as string]));
  const topicByKey = new Map((topics ?? []).map((x) => [normalizeKey(x.name), x.id as string]));

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
      const ids = terms.map((t) => wordByKey.get(normalizeKey(t))).filter((x): x is string => Boolean(x));
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
      cefr_level: it.cefr_level,
      primary_word_id,
      related_topic_id,
      related_word_ids,
      source_batch: batch,
      content_hash: exerciseContentHash(it.type, correct_answer, it.payload),
    });
  }

  const unresolved = received - rows.length;
  const unique = dedupeByKey(rows, (r) => r.content_hash as string);
  const r = await insertIgnore('exercises', unique, 'content_hash');
  if (r.error) return { ok: false, error: r.error, warnings };
  return {
    ok: true,
    kind: 'exercises',
    received,
    inserted: r.inserted,
    skipped_duplicates: unique.length - r.inserted,
    unresolved,
    warnings,
  };
}
