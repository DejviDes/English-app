// Canonical SuperMemo-2 (SM-2), verified against Wozniak's original description.
// Pure and testable: `today` is injected so due_date is deterministic.
import type { Verdict } from '../eval/types';

export interface SM2State {
  ease_factor: number; // EF, new item = 2.5
  interval_days: number; // last interval, new item = 0
  repetitions: number; // consecutive passes, new item = 0
}

export interface SM2Result {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  due_date: string; // 'YYYY-MM-DD' = today + interval_days (local date parts)
}

export const NEW_ITEM_STATE: SM2State = {
  ease_factor: 2.5,
  interval_days: 0,
  repetitions: 0,
};

const MAX_INTERVAL_DAYS = 365; // optional cap: prevents multi-year intervals

/** Map this app's typed 3-level verdict → SM-2 quality (0-5).
 *  correct=5 (+0.10 EF), almost=3 (pass, -0.14 EF), wrong=1 (fail, -0.32 EF). */
export function verdictToQuality(verdict: Verdict): number {
  switch (verdict) {
    case 'correct':
      return 5;
    case 'almost':
      return 3;
    case 'wrong':
      return 1;
  }
}

/** Canonical SM-2 update. `quality` is 0-5. */
export function updateSM2(state: SM2State, quality: number, today: Date): SM2Result {
  // 1. EF update — runs for ALL grades incl. failures (de-facto standard).
  let ef = state.ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ef < 1.3) ef = 1.3; // EF floor

  let repetitions: number;
  let interval: number;

  if (quality < 3) {
    // FAIL: reset schedule to the beginning (EF already recomputed above).
    repetitions = 0;
    interval = 1;
  } else {
    // PASS: advance schedule, keyed off the post-increment repetition count.
    repetitions = state.repetitions + 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(state.interval_days * ef);
  }

  if (interval > MAX_INTERVAL_DAYS) interval = MAX_INTERVAL_DAYS;

  const due = new Date(today);
  due.setDate(due.getDate() + interval);

  return { ease_factor: ef, interval_days: interval, repetitions, due_date: toISODate(due) };
}

/** Local date parts (not toISOString, which is UTC and can shift the day at night). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
