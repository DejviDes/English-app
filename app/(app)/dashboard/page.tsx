import { getDashboard } from '@/lib/repos/dashboard';
import DashboardView from './DashboardView';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const stats = await getDashboard();
  return <DashboardView stats={stats} />;
}
