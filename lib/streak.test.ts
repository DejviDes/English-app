import { describe, expect, it } from 'vitest';
import { addDays, computeStreak } from './streak';

describe('addDays', () => {
  it('adds and subtracts across month boundaries', () => {
    expect(addDays('2026-07-02', -1)).toBe('2026-07-01');
    expect(addDays('2026-07-01', -1)).toBe('2026-06-30');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('computeStreak', () => {
  const today = '2026-07-02';
  it('is 0 with no activity', () => {
    expect(computeStreak([], today)).toBe(0);
  });
  it('counts consecutive days ending today', () => {
    expect(computeStreak(['2026-07-02', '2026-07-01', '2026-06-30'], today)).toBe(3);
  });
  it('tolerates duplicates and unordered input', () => {
    expect(computeStreak(['2026-06-30', '2026-07-02', '2026-07-02', '2026-07-01'], today)).toBe(3);
  });
  it('still counts if the last activity was yesterday (today not done yet)', () => {
    expect(computeStreak(['2026-07-01', '2026-06-30'], today)).toBe(2);
  });
  it('breaks on a gap', () => {
    expect(computeStreak(['2026-07-02', '2026-06-30'], today)).toBe(1);
  });
  it('is 0 if the most recent activity is older than yesterday', () => {
    expect(computeStreak(['2026-06-25'], today)).toBe(0);
  });
});
