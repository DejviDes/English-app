import { buildGrammarLevel } from '@/lib/repos/grammar';
import { Card } from '@/components/ui/primitives';
import GrammarRunner from '@/components/GrammarRunner';

export const dynamic = 'force-dynamic';

export default async function GrammarLevelPage({ params }: { params: Promise<{ slug: string; n: string }> }) {
  const { slug, n } = await params;
  const lesson = await buildGrammarLevel(slug, Number(n));
  if (!lesson) {
    return (
      <Card padding="lg" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Level sa nenašiel.</p>
      </Card>
    );
  }
  return <GrammarRunner lesson={lesson} />;
}
