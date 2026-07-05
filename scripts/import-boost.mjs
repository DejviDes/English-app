// Import the vocab-boost workflow output: filter against ALL existing terms (across POS,
// and "to " variants), dedup, insert words + a multiple-choice exercise per word.
// Usage: node scripts/import-boost.mjs <path-to-workflow-output.json> [source_batch]
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const FILE = process.argv[2];
const SOURCE_BATCH = process.argv[3] || 'boost';
const CHUNK = 500;
const US = String.fromCharCode(31);

if (!FILE) { console.error('Usage: node scripts/import-boost.mjs <file> [source_batch]'); process.exit(1); }

const env = {};
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
}
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// normalize a term for cross-checking: lowercase, trim, drop a leading "to "
const norm = (s) => s.trim().toLowerCase();
const canon = (s) => norm(s).replace(/^to\s+/, '');
const hash = (type, correct, payload) =>
  createHash('sha1').update(`${type}${US}${correct ?? ''}${US}${JSON.stringify(payload)}`).digest('hex');

// find the first array living under a "words" key, anywhere in the parsed object
function findWords(node) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node.words)) return node.words;
  for (const v of Object.values(node)) {
    const found = findWords(v);
    if (found) return found;
  }
  return null;
}

async function insertIgnore(table, rows, onConflict) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { data, error } = await sb.from(table).upsert(rows.slice(i, i + CHUNK), { onConflict, ignoreDuplicates: true }).select('id');
    if (error) throw new Error(`${table}: ${error.message}`);
    inserted += data?.length ?? 0;
  }
  return inserted;
}

async function pageAll(table, columns, filter) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let q = sb.from(table).select(columns).range(from, from + 999);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table} page: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

function mcExercise(word) {
  const tr = word.translation.trim();
  let opts = [...new Set((word.options ?? []).map((o) => String(o).trim()).filter(Boolean))];
  if (opts.length > 6) opts = [tr, ...opts.filter((o) => o.toLowerCase() !== tr.toLowerCase()).slice(0, 5)];
  const idx = opts.findIndex((o) => o.toLowerCase() === tr.toLowerCase());
  if (idx < 0 || opts.length < 3 || opts.length > 6) return null;
  const payload = { prompt: word.term.trim(), options: opts, correct_index: idx };
  return {
    type: 'vocab_multiple_choice', payload, correct_answer: opts[idx], acceptable_answers: [],
    cefr_level: word.cefr_level, primary_word_id: word.id, source_batch: SOURCE_BATCH,
    content_hash: hash('vocab_multiple_choice', opts[idx], payload),
  };
}

async function main() {
  const raw = readFileSync(FILE, 'utf8');
  const parsed = JSON.parse(raw);
  const items = findWords(parsed);
  if (!items) throw new Error('No "words" array found in file');
  console.log(`Read ${items.length} generated words`);

  // existing terms across ALL words, canonicalized (drop "to ")
  const existing = new Set((await pageAll('words', 'term')).map((w) => canon(w.term)));
  console.log(`Existing terms in DB: ${existing.size}`);

  const seen = new Set();      // within-batch content_key
  const canonSeen = new Set(); // within-batch canonical term
  const wordRows = [];
  let skipExisting = 0, skipDupBatch = 0, skipBad = 0;
  for (const it of items) {
    const term = String(it.term ?? '').trim();
    const translation = String(it.translation ?? '').trim();
    if (!term || !translation) { skipBad++; continue; }
    const pos = it.part_of_speech || 'other';
    const c = canon(term);
    if (existing.has(c)) { skipExisting++; continue; }
    if (canonSeen.has(c)) { skipDupBatch++; continue; }
    const content_key = `${norm(term)}|${pos}`;
    if (seen.has(content_key)) { skipDupBatch++; continue; }
    // options sanity: must contain exact translation + >=3 distinct
    const opts = [...new Set((Array.isArray(it.options) ? it.options : []).map((o) => String(o).trim()).filter(Boolean))];
    if (!opts.some((o) => o.toLowerCase() === translation.toLowerCase()) || opts.length < 3) { skipBad++; continue; }
    seen.add(content_key); canonSeen.add(c);
    const level = ['A2', 'B1', 'B2'].includes(it.cefr_level) ? it.cefr_level : 'B1';
    wordRows.push({
      term, translation, part_of_speech: pos, cefr_level: level,
      theme: it.theme ? String(it.theme).trim() : null,
      options: opts, source_batch: SOURCE_BATCH, content_key,
    });
  }
  console.log(`Kept ${wordRows.length}  (skipped: ${skipExisting} already in DB, ${skipDupBatch} dup-in-batch, ${skipBad} invalid)`);

  const wordsInserted = await insertIgnore('words', wordRows, 'content_key');
  console.log(`Words: ${wordsInserted} newly inserted.`);

  const keys = wordRows.map((r) => r.content_key);
  const idByKey = new Map();
  for (let i = 0; i < keys.length; i += CHUNK) {
    const { data } = await sb.from('words').select('id,content_key,translation,options').in('content_key', keys.slice(i, i + CHUNK));
    for (const w of data ?? []) idByKey.set(w.content_key, w);
  }
  const withEx = new Set((await pageAll('exercises', 'primary_word_id')).map((e) => e.primary_word_id).filter(Boolean));

  const exRows = [];
  for (const r of wordRows) {
    const w = idByKey.get(r.content_key);
    if (!w || withEx.has(w.id)) continue;
    const ex = mcExercise({ id: w.id, term: r.term, translation: w.translation, options: w.options, cefr_level: r.cefr_level });
    if (ex) exRows.push(ex);
  }
  const exSeen = new Set();
  const exUnique = exRows.filter((r) => (exSeen.has(r.content_hash) ? false : exSeen.add(r.content_hash)));
  const exInserted = await insertIgnore('exercises', exUnique, 'content_hash');
  console.log(`MC exercises: ${exUnique.length} built, ${exInserted} newly inserted.`);

  const { count: totalWords } = await sb.from('words').select('*', { count: 'exact', head: true });
  console.log(`DB total words: ${totalWords}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
