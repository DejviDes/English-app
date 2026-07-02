// Text normalization for open-answer comparison. Diacritics are PRESERVED in the
// primary form because they are meaningful in Slovak (e.g. `sud` barrel vs `súd`
// court). A diacritics-folded match is handled one tier lower as `almost`.

/** Primary normalization: trim, lowercase, strip punctuation (keep letters,
 *  digits, spaces, and intra-word apostrophes/hyphens), collapse whitespace. */
export function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}\s'’-]/gu, ' ') // drop punctuation, keep accented letters
    .replace(/['’]/g, "'") // unify apostrophes
    .replace(/\s+/g, ' ')
    .trim();
}

/** Secondary: additionally fold diacritics. Used ONLY to detect a "right word,
 *  wrong accents" answer, which scores as `almost`/typo — never fully correct. */
export function foldDiacritics(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').normalize('NFC');
}
