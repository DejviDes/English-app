import 'server-only';
import { createServerClient } from '@/lib/supabase/server';
import { toISODate } from '@/lib/sm2/sm2';
import { computeStreak } from '@/lib/streak';

export const LEVEL_SIZE = 15;
export const REVIEW_EVERY = 5; // a review block after every 5 levels

export type LevelStatus = 'done' | 'current' | 'locked';
export type ReviewStatus = 'done' | 'available' | 'locked';

export interface LevelNode {
  n: number;
  theme: string | null;
  words: number;
  status: LevelStatus;
  blockEnd: boolean;
}

export interface VocabLevels {
  levels: LevelNode[];
  reviews: Record<number, ReviewStatus>;
  totalLevels: number;
  completedLevels: number;
  currentLevel: number | null;
}

export async function getVocabLevels(): Promise<VocabLevels> {
  const supabase = createServerClient();
  const [{ data: levels }, { data: prog }] = await Promise.all([
    supabase.from('level_list').select('lvl,theme,words').order('lvl', { ascending: true }),
    supabase.from('level_progress').select('kind,n,completed'),
  ]);

  const doneLevel = new Set(
    (prog ?? []).filter((p) => p.kind === 'level' && p.completed).map((p) => p.n as number),
  );
  const doneReview = new Set(
    (prog ?? []).filter((p) => p.kind === 'review' && p.completed).map((p) => p.n as number),
  );

  const list = (levels ?? []).map((l) => ({
    n: l.lvl as number,
    theme: (l.theme as string | null) ?? null,
    words: l.words as number,
  }));

  let currentLevel: number | null = null;
  for (const l of list) {
    if (!doneLevel.has(l.n)) {
      currentLevel = l.n;
      break;
    }
  }

  const levelsOut: LevelNode[] = list.map((l) => ({
    ...l,
    status: doneLevel.has(l.n) ? 'done' : l.n === currentLevel ? 'current' : 'locked',
    blockEnd: l.n % REVIEW_EVERY === 0,
  }));

  const totalLevels = list.length;
  const blocks = Math.ceil(totalLevels / REVIEW_EVERY);
  const reviews: Record<number, ReviewStatus> = {};
  for (let b = 1; b <= blocks; b++) {
    const blockLevels = list.filter((l) => Math.ceil(l.n / REVIEW_EVERY) === b);
    const allDone = blockLevels.length > 0 && blockLevels.every((l) => doneLevel.has(l.n));
    reviews[b] = doneReview.has(b) ? 'done' : allDone ? 'available' : 'locked';
  }

  return {
    levels: levelsOut,
    reviews,
    totalLevels,
    completedLevels: doneLevel.size,
    currentLevel,
  };
}

// ---------------- Flashcard lessons ----------------

export interface FlashWord {
  id: string;
  en: string;
  sk: string;
}
export interface RemainingItem {
  id: string;
  r: 'almost' | 'didnt' | null;
}
export interface FlashLesson {
  kind: 'level' | 'review';
  n: number;
  title: string;
  theme: string | null;
  words: FlashWord[];
  direction: number; // 0 = show EN/recall SK, 1 = show SK/recall EN
  remaining: RemainingItem[];
  completed: boolean;
}

async function loadProgress(kind: 'level' | 'review', n: number) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('level_progress')
    .select('direction,remaining,completed')
    .eq('kind', kind)
    .eq('n', n)
    .maybeSingle();
  return data;
}

function wordsToFlash(rows: { id: string; term: string; translation: string }[]): FlashWord[] {
  return rows.map((w) => ({ id: w.id, en: w.term, sk: w.translation }));
}

export async function buildLevel(n: number): Promise<FlashLesson | null> {
  const supabase = createServerClient();
  const { data: words } = await supabase
    .from('words')
    .select('id,term,translation,theme')
    .eq('lvl', n)
    .order('term', { ascending: true });
  if (!words || words.length === 0) return null;
  const prog = await loadProgress('level', n);
  return {
    kind: 'level',
    n,
    title: `Level ${n}`,
    theme: (words[0].theme as string | null) ?? null,
    words: wordsToFlash(words as { id: string; term: string; translation: string }[]),
    direction: (prog?.direction as number | undefined) ?? 0,
    remaining: (prog?.remaining as RemainingItem[] | undefined) ?? [],
    completed: (prog?.completed as boolean | undefined) ?? false,
  };
}

export async function buildReview(block: number): Promise<FlashLesson | null> {
  const supabase = createServerClient();
  const from = (block - 1) * REVIEW_EVERY + 1;
  const to = block * REVIEW_EVERY;
  const lvls: number[] = [];
  for (let l = from; l <= to; l++) lvls.push(l);
  const { data: words } = await supabase
    .from('words')
    .select('id,term,translation')
    .in('lvl', lvls)
    .order('term', { ascending: true });
  if (!words || words.length === 0) return null;
  const prog = await loadProgress('review', block);
  return {
    kind: 'review',
    n: block,
    title: `Review ${block}`,
    theme: null,
    words: wordsToFlash(words as { id: string; term: string; translation: string }[]),
    direction: (prog?.direction as number | undefined) ?? 0,
    remaining: (prog?.remaining as RemainingItem[] | undefined) ?? [],
    completed: (prog?.completed as boolean | undefined) ?? false,
  };
}

// ---------------- Dashboard sections ----------------

export interface Section {
  key: string;
  title: string;
  subtitle: string;
  emoji: string;
  href: string | null;
  progress?: { done: number; total: number };
}

export async function getSections(): Promise<Section[]> {
  const supabase = createServerClient();
  const [{ count: total }, { data: prog }, { count: gTotal }, { data: gProg }] = await Promise.all([
    supabase.from('level_list').select('*', { count: 'exact', head: true }),
    supabase.from('level_progress').select('n,completed').eq('kind', 'level'),
    supabase.from('grammar_levels').select('*', { count: 'exact', head: true }),
    supabase.from('grammar_progress').select('completed'),
  ]);
  const done = (prog ?? []).filter((p) => p.completed).length;
  const gDone = (gProg ?? []).filter((p) => p.completed).length;

  return [
    {
      key: 'vocabulary',
      title: 'Vocabulary',
      subtitle: 'Learn words with flashcard levels',
      emoji: '📚',
      href: '/learn/vocabulary',
      progress: { done, total: total ?? 0 },
    },
    {
      key: 'grammar',
      title: 'Grammar',
      subtitle: 'Tenses — theory & exercises',
      emoji: '📐',
      href: '/learn/grammar',
      progress: { done: gDone, total: gTotal ?? 0 },
    },
    { key: 'word-order', title: 'Word order', subtitle: 'Coming soon', emoji: '🔤', href: null },
  ];
}

export async function getHeaderStats(): Promise<{ streak: number; lastScore: number | null }> {
  const supabase = createServerClient();
  const since = new Date();
  since.setDate(since.getDate() - 400);
  const [attemptsR, quizR, levelR] = await Promise.all([
    supabase.from('attempts').select('created_at').gte('created_at', since.toISOString()),
    supabase.from('quiz_sessions').select('score_pct,created_at').order('created_at', { ascending: false }),
    supabase.from('level_progress').select('updated_at'),
  ]);
  const today = toISODate(new Date());
  const days = [
    ...(attemptsR.data ?? []).map((a) => toISODate(new Date(a.created_at as string))),
    ...(quizR.data ?? []).map((q) => toISODate(new Date(q.created_at as string))),
    ...(levelR.data ?? []).map((l) => toISODate(new Date(l.updated_at as string))),
  ];
  return {
    streak: computeStreak(days, today),
    lastScore: (quizR.data?.[0]?.score_pct as number | undefined) ?? null,
  };
}
