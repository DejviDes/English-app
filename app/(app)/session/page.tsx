import { buildSession } from '@/lib/session/buildSession';
import SessionRunner, { type RunnerItem } from './SessionRunner';

export const dynamic = 'force-dynamic';

export default async function SessionPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }>;
}) {
  const { n } = await searchParams;
  const size = Math.max(10, Math.min(25, Number(n) || 15));
  const queue = await buildSession(size);
  const items: RunnerItem[] = queue.map((q) => ({
    exerciseId: q.exerciseId,
    type: q.type,
    payload: q.payload as RunnerItem['payload'],
  }));

  return <SessionRunner items={items} />;
}
