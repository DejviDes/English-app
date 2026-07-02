-- ============================================================
-- 0005_exercise_cefr.sql
-- Persist the per-exercise CEFR level (the import contract already provides it;
-- it was previously dropped). Backfill existing rows from their target word/topic.
-- ============================================================

alter table exercises add column cefr_level cefr_level;

update exercises
   set cefr_level = coalesce(
     (select w.cefr_level from words w where w.id = exercises.primary_word_id),
     (select t.cefr_level from grammar_topics t where t.id = exercises.related_topic_id)
   );

create index exercises_cefr_idx on exercises (cefr_level);
