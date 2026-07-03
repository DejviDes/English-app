import { buildSession } from '@/lib/session/buildSession';
import SessionRunner, { type RunnerItem } from './SessionRunner';

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
  const size = Math.max(10, Math.min(25, Number(n) || 15));
  const typeFilter = type && ALLOWED_TYPES.includes(type) ? type : undefined; // undefined = mix
  const queue = await buildSession(size, typeFilter);
  const items: RunnerItem[] = queue.map((q) => ({
    exerciseId: q.exerciseId,
    type: q.type,
    payload: q.payload as RunnerItem['payload'],
  }));

  return <SessionRunner items={items} />;
}
