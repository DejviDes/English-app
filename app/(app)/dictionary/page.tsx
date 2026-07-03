import { searchWords } from '@/app/actions/dictionary';
import DictionaryView from './DictionaryView';

export const dynamic = 'force-dynamic';

export default async function DictionaryPage() {
  const first = await searchWords({ q: '', offset: 0 });
  return <DictionaryView initialRows={first.rows} initialTotal={first.total} />;
}
