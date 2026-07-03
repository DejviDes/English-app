-- ============================================================
-- 0009_reviews.sql — daily & weekly review tracking
--   * day_progress.reviewed — the previous-day reinforcement was passed
--   * week_progress         — the whole-week review was passed
-- ============================================================

alter table day_progress add column reviewed boolean not null default false;

create table week_progress (
  week       integer primary key,
  reviewed   boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table week_progress enable row level security;
