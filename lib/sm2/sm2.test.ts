import { describe, expect, it } from 'vitest';
import { NEW_ITEM_STATE, updateSM2, verdictToQuality } from './sm2';

const today = new Date(2026, 6, 2); // 2026-07-02 (month is 0-based)

describe('verdictToQuality', () => {
  it('maps the 3-level verdict', () => {
    expect(verdictToQuality('correct')).toBe(5);
    expect(verdictToQuality('almost')).toBe(3);
    expect(verdictToQuality('wrong')).toBe(1);
  });
});

describe('updateSM2', () => {
  it('new item, q=5 progression 1 → 6 → 17', () => {
    const r1 = updateSM2(NEW_ITEM_STATE, 5, today);
    expect(r1.repetitions).toBe(1);
    expect(r1.interval_days).toBe(1);
    expect(r1.ease_factor).toBeCloseTo(2.6, 5);

    const r2 = updateSM2(r1, 5, today);
    expect(r2.repetitions).toBe(2);
    expect(r2.interval_days).toBe(6);
    expect(r2.ease_factor).toBeCloseTo(2.7, 5);

    const r3 = updateSM2(r2, 5, today);
    expect(r3.repetitions).toBe(3);
    expect(r3.interval_days).toBe(17); // round(6 * 2.8)
  });

  it('failure resets repetitions and interval, still lowers EF', () => {
    const mature = { ease_factor: 2.5, interval_days: 17, repetitions: 3 };
    const r = updateSM2(mature, 1, today);
    expect(r.repetitions).toBe(0);
    expect(r.interval_days).toBe(1);
    expect(r.ease_factor).toBeCloseTo(1.96, 5); // 2.5 - 0.54 (q=1 delta)
  });

  it('q=4 leaves EF unchanged', () => {
    const r = updateSM2({ ease_factor: 2.5, interval_days: 6, repetitions: 2 }, 4, today);
    expect(r.ease_factor).toBeCloseTo(2.5, 5);
  });

  it('EF never drops below the 1.3 floor', () => {
    const r = updateSM2({ ease_factor: 1.3, interval_days: 1, repetitions: 0 }, 0, today);
    expect(r.ease_factor).toBe(1.3);
  });

  it("almost (q=3) passes but lowers EF by 0.14", () => {
    const r = updateSM2(NEW_ITEM_STATE, 3, today);
    expect(r.repetitions).toBe(1);
    expect(r.interval_days).toBe(1);
    expect(r.ease_factor).toBeCloseTo(2.36, 5);
  });

  it('caps the interval at 365 days', () => {
    const huge = { ease_factor: 2.5, interval_days: 300, repetitions: 5 };
    const r = updateSM2(huge, 5, today);
    expect(r.interval_days).toBe(365);
  });

  it('computes due_date from local date parts', () => {
    const r = updateSM2({ ease_factor: 2.5, interval_days: 1, repetitions: 1 }, 5, today);
    expect(r.interval_days).toBe(6);
    expect(r.due_date).toBe('2026-07-08');
  });
});
