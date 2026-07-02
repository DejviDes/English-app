import { getLibrarySummary } from '@/lib/repos/library';
import { getLibraryPage } from '@/app/actions/library';
import LibraryView from './LibraryView';

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  const [summary, first] = await Promise.all([
    getLibrarySummary(),
    getLibraryPage({ status: 'all', type: 'all', offset: 0 }),
  ]);
  return <LibraryView summary={summary} initialRows={first.rows} initialTotal={first.total} />;
}
