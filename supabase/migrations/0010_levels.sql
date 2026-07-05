-- ============================================================
-- 0010_levels.sql — flashcard "levels" (replaces the day/phase journey)
--   * words.lvl    — which level (15 words, one theme) a word belongs to
--   * words.known  — marked true when its level is fully completed
--   * level_progress — per-level self-rating state (resumable mid-level)
--       kind: 'level' (15 words) | 'review' (a block of 5 levels)
--       direction: 0 = show EN, recall SK ; 1 = show SK, recall EN
--       remaining: [{ id, r }] words not yet "knew" this direction (r: 'almost'|'didnt'|null)
-- ============================================================

alter table words add column lvl integer;
alter table words add column known boolean not null default false;
create index words_lvl_idx on words (lvl);

create table level_progress (
  kind       text not null,
  n          integer not null,
  direction  smallint not null default 0,
  remaining  jsonb not null default '[]'::jsonb,
  completed  boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (kind, n)
);
alter table level_progress enable row level security;

create view level_list as
  select lvl, max(theme) as theme, count(*)::int as words
  from words where lvl is not null group by lvl;
