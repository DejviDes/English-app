// One-time bulk import of vocabulary.json → words (+ auto-materialized exercises).
// Usage: node scripts/import-vocabulary.mjs "/abs/path/to/vocabulary.json"
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const FILE =
  process.argv[2] || '/Users/david.trebaticky/Development/Projekty/anj sz apka/vocabulary.json';
const SOURCE_BATCH = 'vocabulary_import';
const CHUNK = 500;
const US = '';

// --- load .env.local (no dependency) ---
const env = {};
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
}
const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || key === 'PASTE_SERVICE_ROLE_KEY_HERE') {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const norm = (s) => s.trim().toLowerCase();
const hash = (type, correct, payload) =>
  createHash('sha1').update(`${type}${US}${correct ?? ''}${US}${JSON.stringify(payload)}`).digest('hex');

function materialize(word) {
  const term = word.term.trim();
  const tr = word.translation.trim();
  const cefr = word.cefr_level;
  const rows = [];
  const push = (type, payload, correct) =>
    rows.push({
      type, payload, correct_answer: correct, acceptable_answers: [],
      cefr_level: cefr, primary_word_id: word.id, source_batch: SOURCE_BATCH,
      content_hash: hash(type, correct, payload),
    });
  push('vocab_en_sk', { prompt: term, prompt_lang: 'en', answer_lang: 'sk', correct_answer: tr }, tr);
  push('vocab_sk_en', { prompt: tr, prompt_lang: 'sk', answer_lang: 'en', correct_answer: term }, term);
  let opts = [...new Set((word.options ?? []).map((o) => o.trim()).filter(Boolean))];
  if (opts.length > 6) opts = [tr, ...opts.filter((o) => o.toLowerCase() !== tr.toLowerCase()).slice(0, 5)];
  const idx = opts.findIndex((o) => o.toLowerCase() === tr.toLowerCase());
  if (idx >= 0 && opts.length >= 3 && opts.length <= 6)
    push('vocab_multiple_choice', { prompt: term, options: opts, correct_index: idx }, opts[idx]);
  return rows;
}

async function insertIgnore(table, rows, onConflict) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { data, error } = await sb
      .from(table)
      .upsert(rows.slice(i, i + CHUNK), { onConflict, ignoreDuplicates: true })
      .select('id');
    if (error) throw new Error(`${table}: ${error.message}`);
    inserted += data?.length ?? 0;
  }
  return inserted;
}

async function pageAll(table, columns) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(columns).range(from, from + 999);
    if (error) throw new Error(`${table} page: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function main() {
  const raw = JSON.parse(readFileSync(FILE, 'utf8'));
  console.log(`Read ${raw.length} items from ${FILE}`);

  // 1. words — dedupe by content_key (term|other)
  const seen = new Set();
  const wordRows = [];
  for (const it of raw) {
    const term = String(it.word ?? '').trim();
    const translation = String(it.correct ?? '').trim();
    if (!term || !translation) continue;
    const content_key = `${norm(term)}|other`;
    if (seen.has(content_key)) continue;
    seen.add(content_key);
    const level = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(it.level) ? it.level : 'B1';
    wordRows.push({
      term, translation, part_of_speech: 'other', cefr_level: level,
      theme: it.okruh ? String(it.okruh).trim() : null,
      options: Array.isArray(it.options) ? it.options.map((o) => String(o).trim()).filter(Boolean) : [],
      source_batch: SOURCE_BATCH, content_key,
    });
  }
  const wordsInserted = await insertIgnore('words', wordRows, 'content_key');
  console.log(`Words: ${wordRows.length} unique, ${wordsInserted} newly inserted.`);

  // 2. materialize exercises for ALL words that currently have none.
  const allWords = await pageAll('words', 'id,term,translation,cefr_level,options');
  const withEx = new Set(
    (await pageAll('exercises', 'primary_word_id'))
      .map((e) => e.primary_word_id)
      .filter(Boolean),
  );
  const exRows = [];
  for (const w of allWords) {
    if (withEx.has(w.id)) continue;
    exRows.push(...materialize(w));
  }
  // de-dupe by content_hash within this batch
  const exSeen = new Set();
  const exUnique = exRows.filter((r) => (exSeen.has(r.content_hash) ? false : exSeen.add(r.content_hash)));
  const exInserted = await insertIgnore('exercises', exUnique, 'content_hash');
  console.log(`Exercises: ${exUnique.length} built, ${exInserted} newly inserted.`);

  const { count: totalWords } = await sb.from('words').select('*', { count: 'exact', head: true });
  const { count: totalEx } = await sb.from('exercises').select('*', { count: 'exact', head: true });
  console.log(`DB totals → words: ${totalWords}, exercises: ${totalEx}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
