// Iterative two-row Levenshtein distance + a length-scaled "typo" threshold.

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** Max edit distance still counted as a "typo" (→ almost), scaled by answer
 *  length so short words aren't over-forgiven (dist 2 on a 3-letter word is a
 *  different word, not a typo). */
export function typoThreshold(canonicalLen: number): number {
  if (canonicalLen <= 3) return 0; // no typo tolerance (cat/dog/go)
  if (canonicalLen <= 7) return 1; // one edit
  return 2; // long words tolerate two
}
