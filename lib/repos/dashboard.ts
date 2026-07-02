import 'server-only';
import { createServerClient } from '@/lib/supabase/server';
import { toISODate } from '@/lib/sm2/sm2';
import { computeStreak } from '@/lib/streak';

export interface DashboardStats {
  toReview: number;
  newItems: number;
  totalWords: number;
  totalTopics: number;
  totalExercises: number;
  dueWithoutExercise: number;
  streak: number;
  lastScore: number | null;
}

export async function getDashboard(): Promise<DashboardStats> {
  const supabase = createServerClient();
  const today = toISODate(new Date());

  const since = new Date();
  since.setDate(since.getDate() - 400);

  // All independent — fire in one round-trip wave.
  const [wordsC, topicsC, exC, toReviewC, newC, dueItemsR, exWordsR, exTopicsR, attemptsR, quizR] =
    await Promise.all([
      supabase.from('words').select('*', { count: 'exact', head: true }),
      supabase.from('grammar_topics').select('*', { count: 'exact', head: true }),
      supabase.from('exercises').select('*', { count: 'exact', head: true }),
      supabase.from('srs_items').select('*', { count: 'exact', head: true }).lte('due_date', today),
      supabase.from('srs_items').select('*', { count: 'exact', head: true }).is('last_reviewed', null),
      supabase.from('srs_items').select('id,kind').lte('due_date', today),
      supabase.from('exercises').select('primary_word_id').not('primary_word_id', 'is', null),
      supabase.from('exercises').select('related_topic_id').not('related_topic_id', 'is', null),
      supabase.from('attempts').select('created_at').gte('created_at', since.toISOString()),
      supabase.from('quiz_sessions').select('score_pct').order('created_at', { ascending: false }).limit(1),
    ]);

  // Due items lacking any exercise → the cue to import a batch.
  const wordSet = new Set((exWordsR.data ?? []).map((e) => e.primary_word_id as string));
  const topicSet = new Set((exTopicsR.data ?? []).map((e) => e.related_topic_id as string));
  const dueWithoutExercise = (dueItemsR.data ?? []).filter((it) =>
    it.kind === 'word' ? !wordSet.has(it.id as string) : !topicSet.has(it.id as string),
  ).length;

  const days = (attemptsR.data ?? []).map((a) => toISODate(new Date(a.created_at as string)));
  const streak = computeStreak(days, today);

  return {
    toReview: toReviewC.count ?? 0,
    newItems: newC.count ?? 0,
    totalWords: wordsC.count ?? 0,
    totalTopics: topicsC.count ?? 0,
    totalExercises: exC.count ?? 0,
    dueWithoutExercise,
    streak,
    lastScore: (quizR.data?.[0]?.score_pct as number | undefined) ?? null,
  };
}
