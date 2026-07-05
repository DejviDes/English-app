import { getVocabLevels } from '@/lib/repos/levels';
import LevelsMap from './LevelsMap';

export const dynamic = 'force-dynamic';

export default async function VocabularyPage() {
  const data = await getVocabLevels();
  return <LevelsMap data={data} />;
}
