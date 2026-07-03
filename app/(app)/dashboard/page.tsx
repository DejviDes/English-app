import { getHeaderStats, getJourney } from '@/lib/repos/journey';
import JourneyMap from './JourneyMap';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [journey, header] = await Promise.all([getJourney(), getHeaderStats()]);
  return <JourneyMap journey={journey} header={header} />;
}
