import { getVocabLevels } from '@/lib/repos/levels';
import { getGrammarLibrary } from '@/lib/repos/grammar';
import LibraryView from './LibraryView';

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  const [data, grammar] = await Promise.all([getVocabLevels(), getGrammarLibrary()]);
  return <LibraryView data={data} grammar={grammar} />;
}
