# English B1 → B2+ — personal learning PWA

Single-user, installable PWA for drilling English vocabulary & grammar with spaced
repetition (SM-2). **No paid AI at runtime** — content is bulk-generated in a normal Claude
chat (see `prompts/generation-prompt.md`), exported to JSON, and imported into the app.

## Stack

Next.js 16 (App Router, TS) · Supabase (Postgres) · Tailwind v4 · Serwist (PWA) · Zod ·
Vitest. Deploy target: Vercel.

## Setup

1. `npm install`
2. Create `.env.local` (already scaffolded — fill the one secret):
   ```
   SUPABASE_URL=https://skndwcybccrfbljfjtjw.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service_role secret from Supabase dashboard → Project Settings → API keys>
   APP_SECRET=<the unlock secret; a random one was generated for you>
   ```
   **Never** prefix these with `NEXT_PUBLIC_`. The service role key stays server-side only.
3. Migrations in `supabase/migrations/` are already applied to the project. To re-apply on a
   fresh DB, run them in order (0001 → 0004) via the Supabase SQL editor / CLI / MCP.
4. `npm run dev` → open http://localhost:3000 → unlock with `APP_SECRET`.

## Scripts

- `npm run dev` — dev server (Turbopack)
- `npm run build` — production build (**webpack**, required by Serwist) + generates `public/sw.js`
- `npm test` — Vitest unit tests (evaluation, SM-2, streak, import contract)
- `npm run lint` — ESLint

## How it works

- **Content loop:** generate a batch in a Claude chat using `prompts/generation-prompt.md`
  → **Import** screen (validated by Zod, deduped) → the app drills it via SM-2.
- **Evaluation** (`lib/eval/`) is pure code: exact / normalized / diacritics / article-only /
  Levenshtein → `correct` · `almost` · `wrong`. No AI.
- **SM-2** (`lib/sm2/`): `correct→q5`, `almost→q3` (pass), `wrong→q1` (fail). State lives on
  `words` / `grammar_topics`; each exercise targets exactly one of them.
- **Analysis loop:** **Export** attempts to JSON → paste into a Claude chat for error analysis
  (the companion prompt at the bottom of the generation prompt).
- **Offline:** app shell + last session cached; answers are evaluated locally and queued in an
  IndexedDB outbox, flushed idempotently (client-generated attempt id) when back online.

## Security

Single shared-secret gate (`APP_SECRET` → httpOnly cookie → `middleware.ts`). All DB access is
server-side via the service role key. RLS is enabled deny-all as defense in depth.

## Architecture map

```
lib/eval/        pure evaluation engine (unit-tested)
lib/sm2/         pure SM-2 (unit-tested)
lib/session/     session builder (due + new + weak buckets)
lib/schemas/     Zod import contract
lib/import-export/ dedup keys + content hashing
lib/offline/     IndexedDB outbox + flush
app/actions/     server actions (attempts, import, export, words)
app/(app)/       gated screens (dashboard, session, import, export, add-word)
supabase/migrations/ schema, RLS, record_attempt() RPC, srs_items view
prompts/         reusable content-generation prompt
```
