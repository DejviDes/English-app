import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface OutboxItem {
  attemptId: string; // client-generated uuid = attempts.id (idempotency key)
  exerciseId: string;
  userAnswer: string;
  verdict: string;
  reason: string;
  createdAt: string; // ISO — flush order
  synced: number; // 0 = pending, 1 = synced
}

interface AppDB extends DBSchema {
  outbox: {
    key: string;
    value: OutboxItem;
    indexes: { 'by-synced': number };
  };
}

let dbp: Promise<IDBPDatabase<AppDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<AppDB>> {
  if (!dbp) {
    dbp = openDB<AppDB>('english', 1, {
      upgrade(db) {
        const store = db.createObjectStore('outbox', { keyPath: 'attemptId' });
        store.createIndex('by-synced', 'synced');
      },
    });
  }
  return dbp;
}
