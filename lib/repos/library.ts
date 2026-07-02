import 'server-only';
import { createServerClient } from '@/lib/supabase/server';

export interface LibraryRow {
  id: string;
  type: string;
  cefr: string | null;
  label: string; // prompt / sentence / matching lefts
  target: string | null; // word term or topic name
  timesUsed: number;
  done: boolean;
}

export interface LibrarySummary {
  total: number;
  done: number;
  todo: number;
}

export const LIBRARY_PAGE = 50;

export interface LibraryFilters {
  status: 'all' | 'todo' | 'done';
  type: string; // 'all' or an exercise type
  offset: number;
}

export async function getLibrarySummary(): Promise<LibrarySummary> {
  const supabase = createServerClient();
  const [t, d] = await Promise.all([
    supabase.from('exercises').select('*', { count: 'exact', head: true }),
    supabase.from('exercises').select('*', { count: 'exact', head: true }).gt('times_used', 0),
  ]);
  const total = t.count ?? 0;
  const done = d.count ?? 0;
  return { total, done, todo: total - done };
}
