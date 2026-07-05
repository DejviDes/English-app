import { getGrammarTopics } from '@/lib/repos/grammar';
import GrammarTopicsView from './GrammarTopicsView';

export const dynamic = 'force-dynamic';

export default async function GrammarPage() {
  const topics = await getGrammarTopics();
  return <GrammarTopicsView topics={topics} />;
}
