// Detect when the ONLY difference between two answers is an English article.
import { normalize } from './normalize';

const ARTICLES = new Set(['a', 'an', 'the']);

const stripArticles = (normalized: string): string =>
  normalized
    .split(' ')
    .filter((t) => !ARTICLES.has(t))
    .join(' ');

/** True iff the two (already-normalized) answers are identical once articles are
 *  removed, AND they were not already identical (an article really is the diff). */
export function differsOnlyByArticle(userNorm: string, canonNorm: string): boolean {
  if (userNorm === canonNorm) return false;
  const stripped = stripArticles(canonNorm);
  return stripArticles(userNorm) === stripped && stripped.length > 0;
}
