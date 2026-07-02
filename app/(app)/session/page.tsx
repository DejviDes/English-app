import { buildSession } from '@/lib/session/buildSession';
import SessionRunner, { type RunnerItem } from './SessionRunner';

export const dynamic = 'force-dynamic';

export default async function SessionPage() {
  const queue = await buildSession();
  const items: RunnerItem[] = queue.map((q) => ({
    exerciseId: q.exerciseId,
    type: q.type,
    payload: q.payload as RunnerItem['payload'],
  }));

  return <SessionRunner items={items} />;
}
