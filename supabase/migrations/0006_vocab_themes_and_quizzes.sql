-- ============================================================
-- 0006_vocab_themes_and_quizzes.sql
--   * words.theme    — vocabulary theme (the source "okruh", e.g. FAMILY)
--   * words.options  — SK multiple-choice options for auto-generated MC questions
--   * quiz_sessions  — history of completed quizzes (% success)
-- ============================================================

alter table words add column theme text;
alter table words add column options text[] not null default '{}';
create index words_theme_idx on words (theme);

create table quiz_sessions (
  id         uuid primary key default gen_random_uuid(),
  total      integer not null,
  correct    integer not null,
  almost     integer not null,
  wrong      integer not null,
  score_pct  real    not null,
  created_at timestamptz not null default now()
);
alter table quiz_sessions enable row level security;
create index quiz_sessions_created_idx on quiz_sessions (created_at);
