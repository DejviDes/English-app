-- ============================================================
-- 0004_record_attempt_idempotent.sql
-- Add a client-generated attempt id as the first parameter so offline replay
-- is idempotent: if the id already exists, skip the insert AND the SM-2 update.
-- ============================================================

drop function if exists record_attempt(
  uuid, text, text, text, smallint, text, uuid, real, integer, integer, date, timestamptz
);

create or replace function record_attempt(
  p_attempt_id    uuid,
  p_exercise_id   uuid,
  p_user_answer   text,
  p_verdict       text,
  p_eval_reason   text,
  p_quality       smallint,
  p_target_table  text,
  p_target_id     uuid,
  p_ease_factor   real,
  p_interval_days integer,
  p_repetitions   integer,
  p_due_date      date,
  p_last_reviewed timestamptz
) returns jsonb
language plpgsql as $$
begin
  insert into attempts (id, exercise_id, word_id, topic_id, user_answer, verdict, quality, eval_reason)
  values (
    p_attempt_id, p_exercise_id,
    case when p_target_table = 'words'          then p_target_id end,
    case when p_target_table = 'grammar_topics' then p_target_id end,
    p_user_answer, p_verdict::verdict, p_quality, p_eval_reason
  )
  on conflict (id) do nothing;

  -- Duplicate replay: attempt already recorded → do NOT re-apply SM-2.
  if not found then
    return jsonb_build_object('due_date', p_due_date, 'duplicate', true);
  end if;

  update exercises set times_used = times_used + 1, last_used_at = now() where id = p_exercise_id;

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

  return jsonb_build_object('due_date', p_due_date, 'duplicate', false);
end;
$$;
