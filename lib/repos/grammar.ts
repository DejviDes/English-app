import 'server-only';
import { createServerClient } from '@/lib/supabase/server';

export interface TheoryExample { en: string; sk: string }
export interface GrammarTheory {
  intro?: string;
  form?: { positive?: string; negative?: string; question?: string };
  usage?: string[];
  signalWords?: string[];
  tips?: string[];
  examples?: TheoryExample[];
}

export type GLevelStatus = 'done' | 'current' | 'locked';

export interface GrammarTopicCard {
  slug: string;
  name: string;
  skName: string | null;
  cefr: string;
  theory: GrammarTheory | null;
  totalLevels: number;
  completedLevels: number;
}

export interface GrammarLevelNode {
  id: string;
  n: number;
  title: string;
  skTitle: string | null;
  exercises: number;
  status: GLevelStatus;
}

export interface GrammarTopicDetail {
  slug: string;
  name: string;
  skName: string | null;
  cefr: string;
  theory: GrammarTheory | null;
  levels: GrammarLevelNode[];
  completedLevels: number;
}

/** Dashboard/hub list of tenses with progress. */
export async function getGrammarTopics(): Promise<GrammarTopicCard[]> {
  const supabase = createServerClient();
  const { data: topics } = await supabase
    .from('grammar_topics')
    .select('id,slug,name,sk_name,cefr_level,sort_order,theory')
    .eq('category', 'tense')
    .not('slug', 'is', null)
    .order('sort_order', { ascending: true });
  if (!topics || topics.length === 0) return [];

  const ids = topics.map((t) => t.id as string);
  const [{ data: levels }, { data: prog }] = await Promise.all([
    supabase.from('grammar_levels').select('id,topic_id').in('topic_id', ids),
    supabase.from('grammar_progress').select('level_id,completed'),
  ]);
  const doneSet = new Set((prog ?? []).filter((p) => p.completed).map((p) => p.level_id as string));
  const byTopic = new Map<string, { total: number; done: number }>();
  for (const l of levels ?? []) {
    const e = byTopic.get(l.topic_id as string) ?? { total: 0, done: 0 };
    e.total += 1;
    if (doneSet.has(l.id as string)) e.done += 1;
    byTopic.set(l.topic_id as string, e);
  }

  return topics.map((t) => {
    const c = byTopic.get(t.id as string) ?? { total: 0, done: 0 };
    return {
      slug: t.slug as string,
      name: t.name as string,
      skName: (t.sk_name as string | null) ?? null,
      cefr: t.cefr_level as string,
      theory: (t.theory as GrammarTheory | null) ?? null,
      totalLevels: c.total,
      completedLevels: c.done,
    };
  });
}

/** Topic page: theory + its ordered levels with lock/current/done status. */
export async function getTopicDetail(slug: string): Promise<GrammarTopicDetail | null> {
  const supabase = createServerClient();
  const { data: topic } = await supabase
    .from('grammar_topics')
    .select('id,slug,name,sk_name,cefr_level,theory')
    .eq('slug', slug)
    .maybeSingle();
  if (!topic) return null;

  const { data: levels } = await supabase
    .from('grammar_levels')
    .select('id,n,title,sk_title')
    .eq('topic_id', topic.id)
    .order('n', { ascending: true });
  const lvlIds = (levels ?? []).map((l) => l.id as string);

  const [{ data: prog }, { data: exCounts }] = await Promise.all([
    lvlIds.length
      ? supabase.from('grammar_progress').select('level_id,completed').in('level_id', lvlIds)
      : Promise.resolve({ data: [] as { level_id: string; completed: boolean }[] }),
    lvlIds.length
      ? supabase.from('exercises').select('grammar_level_id').in('grammar_level_id', lvlIds)
      : Promise.resolve({ data: [] as { grammar_level_id: string }[] }),
  ]);
  const doneSet = new Set((prog ?? []).filter((p) => p.completed).map((p) => p.level_id as string));
  const exByLevel = new Map<string, number>();
  for (const e of exCounts ?? []) {
    const k = e.grammar_level_id as string;
    exByLevel.set(k, (exByLevel.get(k) ?? 0) + 1);
  }

  let currentId: string | null = null;
  for (const l of levels ?? []) {
    if (!doneSet.has(l.id as string)) { currentId = l.id as string; break; }
  }

  const levelNodes: GrammarLevelNode[] = (levels ?? []).map((l) => ({
    id: l.id as string,
    n: l.n as number,
    title: l.title as string,
    skTitle: (l.sk_title as string | null) ?? null,
    exercises: exByLevel.get(l.id as string) ?? 0,
    status: doneSet.has(l.id as string) ? 'done' : l.id === currentId ? 'current' : 'locked',
  }));

  return {
    slug: topic.slug as string,
    name: topic.name as string,
    skName: (topic.sk_name as string | null) ?? null,
    cefr: topic.cefr_level as string,
    theory: (topic.theory as GrammarTheory | null) ?? null,
    levels: levelNodes,
    completedLevels: levelNodes.filter((l) => l.status === 'done').length,
  };
}

export interface GrammarLibraryLevel {
  n: number;
  title: string;
  skTitle: string | null;
  exercises: number;
  done: boolean;
}
export interface GrammarLibraryTopic {
  slug: string;
  name: string;
  skName: string | null;
  cefr: string;
  levels: GrammarLibraryLevel[];
}

/** Library view: every tense with all its levels (launchable, not lock-gated). */
export async function getGrammarLibrary(): Promise<GrammarLibraryTopic[]> {
  const supabase = createServerClient();
  const { data: topics } = await supabase
    .from('grammar_topics')
    .select('id,slug,name,sk_name,cefr_level,sort_order')
    .eq('category', 'tense')
    .not('slug', 'is', null)
    .order('sort_order', { ascending: true });
  if (!topics || topics.length === 0) return [];

  const ids = topics.map((t) => t.id as string);
  const { data: levels } = await supabase
    .from('grammar_levels')
    .select('id,topic_id,n,title,sk_title')
    .in('topic_id', ids)
    .order('n', { ascending: true });
  const lvlIds = (levels ?? []).map((l) => l.id as string);
  const [{ data: prog }, { data: exCounts }] = await Promise.all([
    lvlIds.length
      ? supabase.from('grammar_progress').select('level_id,completed').in('level_id', lvlIds)
      : Promise.resolve({ data: [] as { level_id: string; completed: boolean }[] }),
    lvlIds.length
      ? supabase.from('exercises').select('grammar_level_id').in('grammar_level_id', lvlIds)
      : Promise.resolve({ data: [] as { grammar_level_id: string }[] }),
  ]);
  const doneSet = new Set((prog ?? []).filter((p) => p.completed).map((p) => p.level_id as string));
  const exByLevel = new Map<string, number>();
  for (const e of exCounts ?? []) {
    const k = e.grammar_level_id as string;
    exByLevel.set(k, (exByLevel.get(k) ?? 0) + 1);
  }

  return topics.map((t) => ({
    slug: t.slug as string,
    name: t.name as string,
    skName: (t.sk_name as string | null) ?? null,
    cefr: t.cefr_level as string,
    levels: (levels ?? [])
      .filter((l) => l.topic_id === t.id)
      .map((l) => ({
        n: l.n as number,
        title: l.title as string,
        skTitle: (l.sk_title as string | null) ?? null,
        exercises: exByLevel.get(l.id as string) ?? 0,
        done: doneSet.has(l.id as string),
      })),
  }));
}

export interface GrammarRunnerItem {
  exerciseId: string;
  type: string;
  payload: {
    prompt?: string;
    sentence?: string;
    hint?: string;
    options?: string[];
    correct_index?: number;
    correct_answer?: string;
    acceptable_answers?: string[];
  };
}

export interface GrammarLesson {
  levelId: string;
  n: number;
  title: string;
  skTitle: string | null;
  topicSlug: string;
  topicName: string;
  completed: boolean;
  nextN: number | null;
  items: GrammarRunnerItem[];
}

/** Build a runnable grammar level (its exercises) by topic slug + level number. */
export async function buildGrammarLevel(slug: string, n: number): Promise<GrammarLesson | null> {
  const supabase = createServerClient();
  const { data: topic } = await supabase
    .from('grammar_topics').select('id,slug,name').eq('slug', slug).maybeSingle();
  if (!topic) return null;
  const { data: level } = await supabase
    .from('grammar_levels').select('id,n,title,sk_title').eq('topic_id', topic.id).eq('n', n).maybeSingle();
  if (!level) return null;

  const [{ data: exercises }, { data: prog }, { data: nextLvl }] = await Promise.all([
    supabase.from('exercises')
      .select('id,type,payload')
      .eq('grammar_level_id', level.id)
      .order('id', { ascending: true }),
    supabase.from('grammar_progress').select('completed').eq('level_id', level.id).maybeSingle(),
    supabase.from('grammar_levels').select('n').eq('topic_id', topic.id).eq('n', (level.n as number) + 1).maybeSingle(),
  ]);
  if (!exercises || exercises.length === 0) return null;

  return {
    levelId: level.id as string,
    n: level.n as number,
    title: level.title as string,
    skTitle: (level.sk_title as string | null) ?? null,
    topicSlug: topic.slug as string,
    topicName: topic.name as string,
    completed: (prog?.completed as boolean | undefined) ?? false,
    nextN: nextLvl ? (level.n as number) + 1 : null,
    items: (exercises as { id: string; type: string; payload: GrammarRunnerItem['payload'] }[]).map((e) => ({
      exerciseId: e.id,
      type: e.type,
      payload: e.payload,
    })),
  };
}
