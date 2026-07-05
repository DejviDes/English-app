// Import IPA transcriptions from the ipa-gen workflow output: {items:[{id, ipa}]}.
// Usage: node scripts/import-ipa.mjs <path-to-output.json>
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const FILE = process.argv[2];
if (!FILE) { console.error('Usage: node scripts/import-ipa.mjs <file>'); process.exit(1); }
const env = {};
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
}
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function findItems(node) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node.items)) return node.items;
  for (const v of Object.values(node)) { const f = findItems(v); if (f) return f; }
  return null;
}

const items = (findItems(JSON.parse(readFileSync(FILE, 'utf8'))) || [])
  .filter((x) => x && x.id && x.ipa)
  .map((x) => ({ id: String(x.id), ipa: String(x.ipa).trim().replace(/^\/+|\/+$/g, '').replace(/^\[|\]$/g, '').trim() }));
console.log(`Read ${items.length} IPA entries`);

let updated = 0;
for (const it of items) {
  const { error, count } = await sb.from('words').update({ ipa: it.ipa }, { count: 'exact' }).eq('id', it.id);
  if (error) { console.error(it.id, error.message); continue; }
  updated += count ?? 0;
}
const { count: withIpa } = await sb.from('words').select('*', { count: 'exact', head: true }).not('ipa', 'is', null);
console.log(`Updated ${updated}. Words with IPA now: ${withIpa}`);
