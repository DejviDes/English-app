import { getHeaderStats, getSections } from '@/lib/repos/levels';
import SectionsView from './SectionsView';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [sections, header] = await Promise.all([getSections(), getHeaderStats()]);
  return <SectionsView sections={sections} header={header} />;
}
