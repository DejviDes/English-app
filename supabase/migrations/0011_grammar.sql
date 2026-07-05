-- 0011_grammar.sql — Grammar module: tenses with theory, ordered levels, typed exercises.
-- Reuses grammar_topics (SM-2 target already wired in record_attempt) + exercises.related_topic_id.

-- Extend grammar_topics with hub metadata + structured theory.
alter table grammar_topics
  add column if not exists slug       text,
  add column if not exists sk_name    text,                      -- Slovak name, e.g. "minulý jednoduchý"
  add column if not exists category   text not null default 'tense', -- 'tense' | 'combination'
  add column if not exists theory     jsonb,                     -- {intro, form:{positive,negative,question}, usage[], signalWords[], tips[], examples:[{en,sk}]}
  add column if not exists sort_order int not null default 0;    -- easiest -> hardest

create unique index if not exists grammar_topics_slug_uniq on grammar_topics(slug) where slug is not null;
create index if not exists grammar_topics_sort_idx on grammar_topics(sort_order);

-- Ordered levels within a tense (easiest -> hardest).
create table if not exists grammar_levels (
  id         uuid primary key default gen_random_uuid(),
  topic_id   uuid not null references grammar_topics(id) on delete cascade,
  n          smallint not null,          -- 1..5 within the topic
  title      text not null,              -- EN, e.g. "Negatives & questions"
  sk_title   text,                       -- SK, e.g. "Zápor a otázky"
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (topic_id, n)
);
create index if not exists grammar_levels_topic_idx on grammar_levels(topic_id);

-- Group exercises into a grammar level (nullable: vocab exercises keep it null).
alter table exercises
  add column if not exists grammar_level_id uuid references grammar_levels(id) on delete set null;
create index if not exists exercises_grammar_level_idx on exercises(grammar_level_id);

-- Per-level completion (grammar is answered/auto-graded; attempts still log to `attempts`+SM-2).
create table if not exists grammar_progress (
  level_id   uuid primary key references grammar_levels(id) on delete cascade,
  completed  boolean not null default false,
  correct    int not null default 0,
  total      int not null default 0,
  updated_at timestamptz not null default now()
);

-- Deny-all RLS insurance (service role bypasses), consistent with 0002.
alter table grammar_levels   enable row level security;
alter table grammar_progress enable row level security;
