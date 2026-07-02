import { flushAttempts } from '@/app/actions/attempts';
import { markSynced, pending } from './outbox';

let flushing = false;

/** Flush queued attempts to the server. Safe to call often; no-op when offline. */
export async function flushOutbox(): Promise<number> {
  if (flushing) return 0;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 0;
  flushing = true;
  try {
    const items = await pending();
    if (items.length === 0) return 0;
    const res = await flushAttempts(
      items.map((i) => ({ attemptId: i.attemptId, exerciseId: i.exerciseId, userAnswer: i.userAnswer })),
    );
    // Mark the ones that were actually persisted (flush stops at first error).
    for (let i = 0; i < res.synced; i++) await markSynced(items[i].attemptId);
    return res.synced;
  } catch {
    return 0; // network hiccup — try again on the next trigger
  } finally {
    flushing = false;
  }
}
