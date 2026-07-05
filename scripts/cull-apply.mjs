// Apply the vocab cull: delete words flagged as disease_medical / mistranslation / duplicate,
// EXCEPT useful mistranslated words (fix their translation instead) and non-duplicate false positives.
// Usage: node scripts/cull-apply.mjs <path-to-cull-workflow-output.json> [--dry]
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const FILE = process.argv[2];
const DRY = process.argv.includes('--dry');
if (!FILE) { console.error('Usage: node scripts/cull-apply.mjs <file> [--dry]'); process.exit(1); }

const env = {};
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
}
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// duplicates are handled separately via SQL (agent annotated their terms); here: diseases + mistranslations
const DELETE_CATS = new Set(['disease_medical', 'mistranslation']);
// useful words with bad translations -> keep & fix instead of delete
const FIXES = {
  'tram': 'električka',
  'zebra crossing': 'priechod pre chodcov',
  'background check': 'previerka minulosti',
};
// only these "duplicate"-flagged terms are real duplicates (verified 2+ copies)
const REAL_DUPS = new Set(['family', 'lamp', 'living room', 'sofa']);

function findCut(node) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node.cut)) return node.cut;
  for (const v of Object.values(node)) { const f = findCut(v); if (f) return f; }
  return null;
}

async function main() {
  const cut = findCut(JSON.parse(readFileSync(FILE, 'utf8'))) || [];
  const delIds = [];
  const fixes = [];
  let skippedFix = 0, skippedFalseDup = 0;

  for (const c of cut) {
    if (!DELETE_CATS.has(c.category)) continue;
    const term = String(c.term).trim().toLowerCase();
    if (FIXES[term]) { fixes.push({ id: c.id, term, translation: FIXES[term] }); skippedFix++; continue; }
    if (c.category === 'duplicate' && !REAL_DUPS.has(term)) { skippedFalseDup++; continue; }
    delIds.push(c.id);
  }

  console.log(`Flagged total: ${cut.length}`);
  console.log(`To DELETE: ${delIds.length}  |  to FIX: ${fixes.length}  |  kept (false dups): ${skippedFalseDup}`);
  if (DRY) { console.log('DRY RUN — no changes.'); console.log('Fixes:', fixes); return; }

  // fixes first (so we don't lose them if something fails later)
  for (const f of fixes) {
    const { error } = await sb.from('words').update({ translation: f.translation }).eq('id', f.id);
    if (error) throw new Error(`fix ${f.term}: ${error.message}`);
  }
  console.log(`Fixed ${fixes.length} translations.`);

  // delete in chunks (exercises cascade; attempts.word_id set null)
  let deleted = 0;
  for (let i = 0; i < delIds.length; i += 200) {
    const { data, error } = await sb.from('words').delete().in('id', delIds.slice(i, i + 200)).select('id');
    if (error) throw new Error(`delete: ${error.message}`);
    deleted += data?.length ?? 0;
  }
  console.log(`Deleted ${deleted} words.`);

  const { count } = await sb.from('words').select('*', { count: 'exact', head: true });
  console.log(`DB total words now: ${count}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
