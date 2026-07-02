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

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-10">
      <h1 className="mb-8 text-center text-sm font-semibold uppercase tracking-widest text-slate-400">
        Session
      </h1>
      <SessionRunner items={items} />
    </main>
  );
}
