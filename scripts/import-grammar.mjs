// Import grammar tenses: { topics: [{ slug, name, sk, cefr, theory, levels:[{n, exercises:[...]}] }] }
// Upserts grammar_topics + grammar_levels and REPLACES each level's exercises. Idempotent by
// (content_key / topic_id,n); re-running with new content refreshes exercises without touching progress.
// Usage: node scripts/import-grammar.mjs <path-to-json> [source_batch]
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const FILE = process.argv[2];
const SOURCE_BATCH = process.argv[3] || 'grammar';
const US = String.fromCharCode(31);
if (!FILE) { console.error('Usage: node scripts/import-grammar.mjs <file> [source_batch]'); process.exit(1); }

const env = {};
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
}
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// canonical order (easiest -> hardest) + fixed level titles
const SORT = ['present-simple','present-continuous','past-simple','future-simple','present-perfect',
  'past-continuous','present-perfect-continuous','past-perfect','future-continuous',
  'past-perfect-continuous','future-perfect','future-perfect-continuous'];
const LEVEL_TITLES = {
  1: { title: 'Form & recognition', sk: 'Rozpoznanie tvaru' },
  2: { title: 'Positive sentences', sk: 'Kladné vety' },
  3: { title: 'Negatives & questions', sk: 'Zápor a otázky' },
  4: { title: 'Usage & signal words', sk: 'Použitie a časové výrazy' },
  5: { title: 'Mixed practice', sk: 'Zmiešané cvičenia' },
};

const hash = (type, correct, payload) =>
  createHash('sha1').update(`${type}${US}${correct ?? ''}${US}${JSON.stringify(payload)}`).digest('hex');
const norm = (s) => String(s).trim().toLowerCase();
const countBlanks = (s) => (String(s).match(/___/g) || []).length;

function findTopics(node) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node.topics)) return node.topics;
  for (const v of Object.values(node)) { const f = findTopics(v); if (f) return f; }
  return null;
}

/** Build a validated exercise row for a level, or null if invalid. */
function buildExercise(ex, topicId, levelId, cefrFallback) {
  const cefr = ['A2', 'B1', 'B2', 'C1'].includes(ex.cefr_level) ? ex.cefr_level : cefrFallback;
  const base = { cefr_level: cefr, related_topic_id: topicId, grammar_level_id: levelId, source_batch: SOURCE_BATCH, acceptable_answers: [] };

  if (ex.type === 'grammar_choose_option') {
    const opts = [...new Set((ex.options ?? []).map((o) => String(o).trim()).filter(Boolean))];
    if (opts.length < 3 || opts.length > 4) return null;
    let idx = Number.isInteger(ex.correct_index) ? ex.correct_index : -1;
    // trust correct_answer if it disagrees / index out of range
    const byAns = opts.findIndex((o) => norm(o) === norm(ex.correct_answer));
    if (idx < 0 || idx >= opts.length || (byAns >= 0 && byAns !== idx)) idx = byAns;
    if (idx < 0) return null;
    const prompt = String(ex.prompt ?? '').trim();
    if (!prompt) return null;
    const payload = { prompt, options: opts, correct_index: idx };
    return { ...base, type: ex.type, payload, correct_answer: opts[idx], content_hash: hash(ex.type, opts[idx], payload) };
  }

  if (ex.type === 'grammar_fill_form') {
    const sentence = String(ex.sentence ?? '').trim();
    const answer = String(ex.correct_answer ?? '').trim();
    if (countBlanks(sentence) !== 1 || !answer) return null;
    const payload = { sentence, correct_answer: answer, hint: ex.hint ? String(ex.hint).trim() : undefined,
      acceptable_answers: Array.isArray(ex.acceptable_answers) ? ex.acceptable_answers.map((a) => String(a).trim()).filter(Boolean) : [] };
    return { ...base, type: ex.type, payload, correct_answer: answer,
      acceptable_answers: payload.acceptable_answers, content_hash: hash(ex.type, answer, payload) };
  }

  if (ex.type === 'grammar_fix_error') {
    const sentence = String(ex.sentence ?? '').trim();
    const answer = String(ex.correct_answer ?? '').trim();
    if (!sentence || !answer || norm(sentence) === norm(answer)) return null;
    const payload = { sentence, correct_answer: answer,
      acceptable_answers: Array.isArray(ex.acceptable_answers) ? ex.acceptable_answers.map((a) => String(a).trim()).filter(Boolean) : [] };
    return { ...base, type: ex.type, payload, correct_answer: answer,
      acceptable_answers: payload.acceptable_answers, content_hash: hash(ex.type, answer, payload) };
  }
  return null;
}

async function main() {
  const parsed = JSON.parse(readFileSync(FILE, 'utf8'));
  const topics = findTopics(parsed);
  if (!topics) throw new Error('No "topics" array found');
  console.log(`Read ${topics.length} tense(s)`);

  let totalEx = 0, totalLevels = 0, skipped = 0;
  for (const t of topics) {
    const name = String(t.name ?? '').trim();
    const slug = String(t.slug ?? '').trim();
    if (!name || !slug) { console.warn('  skip topic without name/slug'); continue; }
    const sort_order = SORT.indexOf(slug) >= 0 ? SORT.indexOf(slug) + 1 : 99;
    const cefr = ['A2', 'B1', 'B2', 'C1'].includes(t.cefr) ? t.cefr : 'B1';

    const { data: topRow, error: topErr } = await sb.from('grammar_topics')
      .upsert({ name, slug, sk_name: t.sk ?? null, cefr_level: cefr, category: 'tense',
        theory: t.theory ?? null, sort_order, content_key: norm(name) }, { onConflict: 'content_key' })
      .select('id').single();
    if (topErr) throw new Error(`topic ${slug}: ${topErr.message}`);
    const topicId = topRow.id;

    for (const lvl of t.levels ?? []) {
      const n = Number(lvl.n);
      if (!(n >= 1 && n <= 5)) continue;
      const tt = LEVEL_TITLES[n];
      const { data: lvlRow, error: lvlErr } = await sb.from('grammar_levels')
        .upsert({ topic_id: topicId, n, title: tt.title, sk_title: tt.sk, sort_order: n }, { onConflict: 'topic_id,n' })
        .select('id').single();
      if (lvlErr) throw new Error(`level ${slug}/${n}: ${lvlErr.message}`);
      const levelId = lvlRow.id;
      totalLevels++;

      // replace this level's exercises
      await sb.from('exercises').delete().eq('grammar_level_id', levelId);
      const rows = [];
      const seen = new Set();
      for (const ex of lvl.exercises ?? []) {
        const row = buildExercise(ex, topicId, levelId, cefr);
        if (!row) { skipped++; continue; }
        if (seen.has(row.content_hash)) continue;
        seen.add(row.content_hash);
        rows.push(row);
      }
      if (rows.length) {
        const { error: exErr } = await sb.from('exercises').insert(rows);
        if (exErr) throw new Error(`exercises ${slug}/${n}: ${exErr.message}`);
        totalEx += rows.length;
      }
    }
    console.log(`  ${slug}: ${(t.levels ?? []).length} levels`);
  }
  console.log(`Levels: ${totalLevels}, exercises inserted: ${totalEx}, skipped invalid: ${skipped}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
