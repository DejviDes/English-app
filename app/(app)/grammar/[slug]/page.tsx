import { getTopicDetail } from '@/lib/repos/grammar';
import { Card } from '@/components/ui/primitives';
import TopicMap from './TopicMap';

export const dynamic = 'force-dynamic';

export default async function GrammarTopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await getTopicDetail(slug);
  if (!detail) {
    return (
      <Card padding="lg" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Čas sa nenašiel.</p>
      </Card>
    );
  }
  return <TopicMap detail={detail} />;
}
