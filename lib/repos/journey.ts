import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase/server';
import { toISODate } from '@/lib/sm2/sm2';
import { computeStreak } from '@/lib/streak';

const MC = 'vocab_multiple_choice';
const ENSK = 'vocab_en_sk';
const SKEN = 'vocab_sk_en';
const ALL_TYPES = [MC, ENSK, SKEN];

export type DayStatus = 'done' | 'current' | 'locked';

export interface JourneyDay {
  day: number;
  theme: string | null;
  words: number;
  phase: number; // 0..3 (3 = learned)
  reviewed: boolean;
  status: DayStatus;
  weekEnd: boolean;
}

export interface Journey {
  days: JourneyDay[];
  totalDays: number;
  completedDays: number;
  currentDay: number | null;
  weeks: Record<number, { allDone: boolean; reviewed: boolean }>;
}

export async function getJourney(): Promise<Journey> {
  const supabase = createServerClient();
  const [{ data: days }, { data: prog }, { data: weeks }] = await Promise.all([
    supabase.from('day_list').select('day,theme,words').order('day', { ascending: true }),
    supabase.from('day_progress').select('day,phase,reviewed'),
    supabase.from('week_progress').select('week,reviewed'),
  ]);

  const progByDay = new Map((prog ?? []).map((p) => [p.day as number, p]));
  const weekReviewed = new Map((weeks ?? []).map((w) => [w.week as number, w.reviewed as boolean]));

  const list = (days ?? []).map((d) => {
    const p = progByDay.get(d.day as number);
    return {
      day: d.day as number,
      theme: (d.theme as string | null) ?? null,
      words: d.words as number,
      phase: (p?.phase as number | undefined) ?? 0,
      reviewed: (p?.reviewed as boolean | undefined) ?? false,
    };
  });

  let currentDay: number | null = null;
  for (const d of list) {
    if (d.phase < 3) {
      currentDay = d.day;
      break;
    }
  }

  const daysOut: JourneyDay[] = list.map((d) => {
    let status: DayStatus;
    if (d.phase >= 3) status = 'done';
    else if (currentDay !== null && d.day === currentDay) status = 'current';
    else status = 'locked';
    return { ...d, status, weekEnd: d.day % 7 === 0 };
  });

  const totalDays = list.length;
  const weekCount = Math.ceil(totalDays / 7);
  const weeksOut: Record<number, { allDone: boolean; reviewed: boolean }> = {};
  for (let w = 1; w <= weekCount; w++) {
    const inWeek = list.filter((d) => Math.ceil(d.day / 7) === w);
    weeksOut[w] = {
      allDone: inWeek.length > 0 && inWeek.every((d) => d.phase >= 3),
      reviewed: weekReviewed.get(w) ?? false,
    };
  }

  return {
    days: daysOut,
    totalDays,
    completedDays: list.filter((d) => d.phase >= 3).length,
    currentDay,
    weeks: weeksOut,
  };
}

// ---------------- Lessons ----------------

export type LessonMode = 'day-learn' | 'day-review' | 'week-review';

export interface LessonQuestion {
  exerciseId: string;
  type: string;
  payload: unknown;
  en: string; // word term (for bilingual feedback)
  sk: string; // word translation
}

export interface LessonPhase {
  label: string;
  hint: string;
  items: LessonQuestion[];
}

export interface Lesson {
  mode: LessonMode;
  id: number; // day or week number
  title: string;
  theme: string | null;
  words: { en: string; sk: string }[];
  startPhase: number;
  phases: LessonPhase[];
  weekEnd: boolean;
}

interface WordRow {
  id: string;
  term: string;
  translation: string;
  theme: string | null;
}

async function fetchExercises(supabase: SupabaseClient, wordIds: string[], types: string[]) {
  const { data } = await supabase
    .from('exercises')
    .select('id,type,payload,primary_word_id')
    .in('primary_word_id', wordIds)
    .in('type', types);
  return data ?? [];
}

function toQuestion(
  e: { id: string; type: string; payload: unknown; primary_word_id: string },
  byId: Map<string, WordRow>,
): LessonQuestion {
  const w = byId.get(e.primary_word_id);
  return { exerciseId: e.id, type: e.type, payload: e.payload, en: w?.term ?? '', sk: w?.translation ?? '' };
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Day learn lesson: 3 escalating phases over the day's 50 words. */
export async function buildDayLesson(day: number): Promise<Lesson | null> {
  const supabase = createServerClient();
  const { data: words } = await supabase.from('words').select('id,term,translation,theme').eq('day', day);
  if (!words || words.length === 0) return null;
  const byId = new Map((words as WordRow[]).map((w) => [w.id, w]));
  const wordIds = (words as WordRow[]).map((w) => w.id);
  const theme = (words[0] as WordRow).theme;

  const [exs, prog] = await Promise.all([
    fetchExercises(supabase, wordIds, ALL_TYPES),
    supabase.from('day_progress').select('phase').eq('day', day).maybeSingle(),
  ]);

  const byType: Record<string, LessonQuestion[]> = { [MC]: [], [ENSK]: [], [SKEN]: [] };
  for (const e of exs) byType[e.type]?.push(toQuestion(e, byId));

  return {
    mode: 'day-learn',
    id: day,
    title: `Day ${day}`,
    theme,
    words: (words as WordRow[]).map((w) => ({ en: w.term, sk: w.translation })).sort((a, b) => a.en.localeCompare(b.en)),
    startPhase: (prog.data?.phase as number | undefined) ?? 0,
    phases: [
      { label: 'Multiple choice', hint: 'Pick the Slovak meaning', items: byType[MC] },
      { label: 'Type EN → SK', hint: 'Write the Slovak translation', items: byType[ENSK] },
      { label: 'Type SK → EN', hint: 'Write the English word', items: byType[SKEN] },
    ],
    weekEnd: day % 7 === 0,
  };
}

/** Day review: one mixed phase (a random exercise type per word), loop till all correct. */
export async function buildDayReview(day: number): Promise<Lesson | null> {
  const supabase = createServerClient();
  const { data: words } = await supabase.from('words').select('id,term,translation,theme').eq('day', day);
  if (!words || words.length === 0) return null;
  const byId = new Map((words as WordRow[]).map((w) => [w.id, w]));
  const wordIds = (words as WordRow[]).map((w) => w.id);

  const exs = await fetchExercises(supabase, wordIds, ALL_TYPES);
  const byWord = new Map<string, typeof exs>();
  for (const e of exs) {
    const arr = byWord.get(e.primary_word_id) ?? [];
    arr.push(e);
    byWord.set(e.primary_word_id, arr);
  }
  const items: LessonQuestion[] = [];
  for (const wid of wordIds) {
    const pool = byWord.get(wid);
    if (pool && pool.length) items.push(toQuestion(pick(pool), byId));
  }

  return {
    mode: 'day-review',
    id: day,
    title: `Day ${day} review`,
    theme: (words[0] as WordRow).theme,
    words: (words as WordRow[]).map((w) => ({ en: w.term, sk: w.translation })).sort((a, b) => a.en.localeCompare(b.en)),
    startPhase: 0,
    phases: [{ label: 'Review', hint: 'Recall each word', items }],
    weekEnd: day % 7 === 0,
  };
}

/** Weekly review: recognition (MC) over the whole week's words, loop till all correct. */
export async function buildWeekReview(week: number): Promise<Lesson | null> {
  const supabase = createServerClient();
  const dayNums: number[] = [];
  for (let d = (week - 1) * 7 + 1; d <= week * 7; d++) dayNums.push(d);
  const { data: words } = await supabase.from('words').select('id,term,translation,theme').in('day', dayNums);
  if (!words || words.length === 0) return null;
  const byId = new Map((words as WordRow[]).map((w) => [w.id, w]));
  const wordIds = (words as WordRow[]).map((w) => w.id);

  const exs = await fetchExercises(supabase, wordIds, [MC]);
  const items = exs.map((e) => toQuestion(e, byId));

  return {
    mode: 'week-review',
    id: week,
    title: `Week ${week} review`,
    theme: null,
    words: (words as WordRow[]).map((w) => ({ en: w.term, sk: w.translation })).sort((a, b) => a.en.localeCompare(b.en)),
    startPhase: 0,
    phases: [{ label: 'Weekly review', hint: 'Recognize each word', items }],
    weekEnd: true,
  };
}

export async function getHeaderStats(): Promise<{ streak: number; lastScore: number | null }> {
  const supabase = createServerClient();
  const since = new Date();
  since.setDate(since.getDate() - 400);
  const [attemptsR, quizR] = await Promise.all([
    supabase.from('attempts').select('created_at').gte('created_at', since.toISOString()),
    supabase.from('quiz_sessions').select('score_pct').order('created_at', { ascending: false }).limit(1),
  ]);
  const today = toISODate(new Date());
  const days = (attemptsR.data ?? []).map((a) => toISODate(new Date(a.created_at as string)));
  return {
    streak: computeStreak(days, today),
    lastScore: (quizR.data?.[0]?.score_pct as number | undefined) ?? null,
  };
}
