// Delete words by id list. Usage: node scripts/delete-ids.mjs <ids.json>  (file: {"ids":[...]})
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const FILE = process.argv[2];
if (!FILE) { console.error('Usage: node scripts/delete-ids.mjs <ids.json>'); process.exit(1); }
const env = {};
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
}
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ids = JSON.parse(readFileSync(FILE, 'utf8')).ids || [];
let deleted = 0;
for (let i = 0; i < ids.length; i += 200) {
  const { data, error } = await sb.from('words').delete().in('id', ids.slice(i, i + 200)).select('id');
  if (error) { console.error(error.message); process.exit(1); }
  deleted += data?.length ?? 0;
}
const { count } = await sb.from('words').select('*', { count: 'exact', head: true });
console.log(`Deleted ${deleted}. DB total words now: ${count}`);
