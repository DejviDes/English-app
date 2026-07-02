import { getDB, type OutboxItem } from './db';

export async function enqueue(item: Omit<OutboxItem, 'synced'>): Promise<void> {
  const db = await getDB();
  await db.put('outbox', { ...item, synced: 0 });
}

export async function pending(): Promise<OutboxItem[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('outbox', 'by-synced', 0);
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function pendingCount(): Promise<number> {
  return (await pending()).length;
}

export async function markSynced(attemptId: string): Promise<void> {
  const db = await getDB();
  const it = await db.get('outbox', attemptId);
  if (it) await db.put('outbox', { ...it, synced: 1 });
}
