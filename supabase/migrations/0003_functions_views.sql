-- ============================================================
-- 0003_functions_views.sql
--   * srs_items  — unified schedulable-item view (words + topics)
--   * record_attempt() — persist one answer atomically (one txn)
-- JS computes SM-2; this function only persists the results.
-- ============================================================

-- ---------- Unified schedulable items ----------
-- 'word' sorts before 'topic' alphabetically -> vocab wins ties (priority #1).
create view srs_items as
  select id, 'word'::text  as kind, ease_factor, interval_days, repetitions,
         due_date, last_reviewed, created_at, cefr_level
  from words
  union all
  select id, 'topic'::text as kind, ease_factor, interval_days, repetitions,
         due_date, last_reviewed, created_at, cefr_level
  from grammar_topics;

-- ---------- Atomic "record an answer" ----------
-- One implicit transaction: insert attempt, bump exercise usage counters,
-- and write the pre-computed SM-2 state onto the single target row.
create or replace function record_attempt(
  p_exercise_id   uuid,
  p_user_answer   text,
  p_verdict       text,            -- 'correct' | 'almost' | 'wrong'
  p_eval_reason   text,
  p_quality       smallint,        -- SM-2 q actually applied
  p_target_table  text,            -- 'words' | 'grammar_topics'
  p_target_id     uuid,
  p_ease_factor   real,
  p_interval_days integer,
  p_repetitions   integer,
  p_due_date      date,
  p_last_reviewed timestamptz
) returns jsonb
language plpgsql as $$
begin
  insert into attempts (exercise_id, word_id, topic_id, user_answer, verdict, quality, eval_reason)
  values (
    p_exercise_id,
    case when p_target_table = 'words'          then p_target_id end,
    case when p_target_table = 'grammar_topics' then p_target_id end,
    p_user_answer, p_verdict::verdict, p_quality, p_eval_reason
  );

  update exercises
     set times_used = times_used + 1, last_used_at = now()
   where id = p_exercise_id;

  if p_target_id is not null then
    if p_target_table = 'words' then
      update words
         set ease_factor = p_ease_factor, interval_days = p_interval_days,
             repetitions = p_repetitions, due_date = p_due_date, last_reviewed = p_last_reviewed
       where id = p_target_id;
    elsif p_target_table = 'grammar_topics' then
      update grammar_topics
         set ease_factor = p_ease_factor, interval_days = p_interval_days,
             repetitions = p_repetitions, due_date = p_due_date, last_reviewed = p_last_reviewed
       where id = p_target_id;
    end if;
  end if;

  return jsonb_build_object('due_date', p_due_date);
end;
$$;
