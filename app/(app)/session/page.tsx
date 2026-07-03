import { buildSession } from '@/lib/session/buildSession';
import { getDashboard } from '@/lib/repos/dashboard';
import SessionRunner, { type RunnerItem } from './SessionRunner';
import SessionStart from './SessionStart';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = [
  'vocab_en_sk',
  'vocab_sk_en',
  'vocab_fill_blank',
  'vocab_multiple_choice',
  'vocab_matching',
  'grammar_fill_form',
  'grammar_choose_option',
  'grammar_fix_error',
];

export default async function SessionPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string; type?: string }>;
}) {
  const { n, type } = await searchParams;

  // No length param → show the free-practice chooser.
  if (!n) {
    const stats = await getDashboard();
    return <SessionStart stats={stats} />;
  }

  const size = Math.max(10, Math.min(25, Number(n) || 15));
  const typeFilter = type && ALLOWED_TYPES.includes(type) ? type : undefined;
  const queue = await buildSession(size, typeFilter);
  const items: RunnerItem[] = queue.map((q) => ({
    exerciseId: q.exerciseId,
    type: q.type,
    payload: q.payload as RunnerItem['payload'],
  }));

  return <SessionRunner items={items} />;
}
