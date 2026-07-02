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
}

export async function getDashboard(): Promise<DashboardStats> {
  const supabase = createServerClient();
  const today = toISODate(new Date());

  const [wordsC, topicsC, exC, toReviewC, newC] = await Promise.all([
    supabase.from('words').select('*', { count: 'exact', head: true }),
    supabase.from('grammar_topics').select('*', { count: 'exact', head: true }),
    supabase.from('exercises').select('*', { count: 'exact', head: true }),
    supabase.from('srs_items').select('*', { count: 'exact', head: true }).lte('due_date', today),
    supabase.from('srs_items').select('*', { count: 'exact', head: true }).is('last_reviewed', null),
  ]);

  // Due items lacking any exercise → the cue to import a batch.
  const [{ data: dueItems }, { data: exWords }, { data: exTopics }] = await Promise.all([
    supabase.from('srs_items').select('id,kind').lte('due_date', today),
    supabase.from('exercises').select('primary_word_id').not('primary_word_id', 'is', null),
    supabase.from('exercises').select('related_topic_id').not('related_topic_id', 'is', null),
  ]);
  const wordSet = new Set((exWords ?? []).map((e) => e.primary_word_id as string));
  const topicSet = new Set((exTopics ?? []).map((e) => e.related_topic_id as string));
  const dueWithoutExercise = (dueItems ?? []).filter((it) =>
    it.kind === 'word' ? !wordSet.has(it.id as string) : !topicSet.has(it.id as string),
  ).length;

  // Streak from attempt activity days (last ~400 days), in local time.
  const since = new Date();
  since.setDate(since.getDate() - 400);
  const { data: attempts } = await supabase
    .from('attempts')
    .select('created_at')
    .gte('created_at', since.toISOString());
  const days = (attempts ?? []).map((a) => toISODate(new Date(a.created_at as string)));
  const streak = computeStreak(days, today);

  return {
    toReview: toReviewC.count ?? 0,
    newItems: newC.count ?? 0,
    totalWords: wordsC.count ?? 0,
    totalTopics: topicsC.count ?? 0,
    totalExercises: exC.count ?? 0,
    dueWithoutExercise,
    streak,
  };
}
