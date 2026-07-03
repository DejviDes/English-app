-- ============================================================
-- 0007_journey.sql — the learning "journey"
--   * words.day     — which day-batch (50 words, one theme) a word belongs to
--   * day_progress  — how far through a day's phases the learner is
-- Phases: 0 = not started, 1 = MC done, 2 = EN→SK done, 3 = SK→EN done (complete)
-- ============================================================

alter table words add column day integer;
create index words_day_idx on words (day);

create table day_progress (
  day          integer primary key,
  phase        smallint not null default 0,
  completed_at timestamptz,
  updated_at   timestamptz not null default now()
);
alter table day_progress enable row level security;
