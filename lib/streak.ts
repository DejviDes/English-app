// Pure streak computation from a set of activity days.

/** Add `n` days to a 'YYYY-MM-DD' string using local date parts. */
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * Consecutive-day streak ending today (or yesterday, if nothing done yet today).
 * @param days  activity days as 'YYYY-MM-DD' (any order, may contain duplicates)
 * @param today 'YYYY-MM-DD'
 */
export function computeStreak(days: string[], today: string): number {
  const set = new Set(days);
  let cursor = today;
  if (!set.has(cursor)) {
    cursor = addDays(today, -1);
    if (!set.has(cursor)) return 0; // no activity today or yesterday → streak broken
  }
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
