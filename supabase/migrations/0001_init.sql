-- ============================================================
-- 0001_init.sql — Personal English B1->B2 PWA. Single user.
-- Tables, enums, SM-2 state columns, dedup columns, indexes.
-- ============================================================

-- ---------- ENUMS ----------
create type part_of_speech as enum
  ('noun','verb','adjective','adverb','phrase','phrasal_verb','idiom','other');

create type cefr_level as enum ('A1','A2','B1','B2','C1','C2');

create type exercise_type as enum
  ('vocab_en_sk','vocab_sk_en','vocab_fill_blank','vocab_multiple_choice','vocab_matching',
   'grammar_fill_form','grammar_choose_option','grammar_fix_error');

create type verdict as enum ('correct','almost','wrong');

-- ---------- WORDS (knowledge unit + SM-2 state) ----------
create table words (
  id               uuid primary key default gen_random_uuid(),
  term             text not null,               -- EN
  translation      text not null,               -- SK
  part_of_speech   part_of_speech not null,
  cefr_level       cefr_level not null,
  example_sentence text,
  -- SM-2 scheduling state
  ease_factor      real    not null default 2.5,
  interval_days    integer not null default 0,
  repetitions      integer not null default 0,
  due_date         date    not null default current_date,
  last_reviewed    timestamptz,
  source_batch     text,
  created_at       timestamptz not null default now(),
  -- dedup natural key = lower(trim(term)) || '|' || part_of_speech, computed by
  -- the app on insert (import/add-word). "run" the noun != "run" the verb.
  -- Nullable so hand-seeded rows may omit it (Postgres allows multiple NULLs).
  content_key      text unique
);

-- ---------- GRAMMAR TOPICS (knowledge unit + SM-2 state) ----------
create table grammar_topics (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  cefr_level     cefr_level not null,
  notes          text,
  ease_factor    real    not null default 2.5,
  interval_days  integer not null default 0,
  repetitions    integer not null default 0,
  due_date       date    not null default current_date,
  last_reviewed  timestamptz,
  source_batch   text,
  created_at     timestamptz not null default now(),
  -- dedup natural key = lower(trim(name)), computed by the app on insert.
  content_key    text unique
);

-- ---------- EXERCISES (drilled stock; imported in bulk) ----------
create table exercises (
  id                 uuid primary key default gen_random_uuid(),
  type               exercise_type not null,
  payload            jsonb not null,            -- per-type shape, Zod-validated at import (source of truth)
  correct_answer     text,                      -- nullable: matching keeps its key in payload.pairs
  acceptable_answers text[] not null default '{}',
  -- scheduling target: EXACTLY ONE of these (see CHECK)
  primary_word_id    uuid references words(id)          on delete cascade,
  related_topic_id   uuid references grammar_topics(id) on delete cascade,
  -- secondary metadata only; NOT used by the scheduler
  related_word_ids   uuid[] not null default '{}',
  source_batch       text,
  imported_at        timestamptz not null default now(),
  -- exercise-picking sort keys (SM-2 re-drills, so we sort not filter)
  times_used         integer not null default 0,
  last_used_at       timestamptz,
  -- dedup: content hash of the graded essence, computed by the import code
  -- (lib/import-export/dedup.ts). Nullable so hand-seeded rows may omit it;
  -- Postgres allows multiple NULLs under a UNIQUE constraint.
  content_hash       text unique,
  constraint exercises_one_target check (
    (primary_word_id is not null and related_topic_id is null) or
    (primary_word_id is null     and related_topic_id is not null)
  )
);

-- ---------- ATTEMPTS (append-only history) ----------
create table attempts (
  id            uuid primary key default gen_random_uuid(),
  exercise_id   uuid not null references exercises(id) on delete cascade,
  -- denormalized target snapshot: survives exercise deletion & speeds export
  word_id       uuid references words(id)          on delete set null,
  topic_id      uuid references grammar_topics(id) on delete set null,
  user_answer   text not null,
  verdict       verdict  not null,
  quality       smallint not null,               -- SM-2 q (0-5) actually applied
  eval_reason   text,                            -- 'typo','missing_article','exact',...
  created_at    timestamptz not null default now()
);

-- ---------- INDEXES ----------
-- Hot query: "due knowledge units ordered by due_date"
create index words_due_idx           on words          (due_date);
create index words_ease_idx          on words          (ease_factor);
create index grammar_topics_due_idx  on grammar_topics (due_date);
create index grammar_topics_ease_idx on grammar_topics (ease_factor);

-- Session build: fetch exercises for a given scheduling target.
create index exercises_word_idx  on exercises (primary_word_id);
create index exercises_topic_idx on exercises (related_topic_id);

-- Export/analysis: attempts by time, and "not correct".
create index attempts_created_idx  on attempts (created_at);
create index attempts_verdict_idx  on attempts (verdict) where verdict <> 'correct';
create index attempts_exercise_idx on attempts (exercise_id);
