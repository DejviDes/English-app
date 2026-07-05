import { buildLevel } from '@/lib/repos/levels';
import { Card } from '@/components/ui/primitives';
import FlashcardRunner from '@/components/FlashcardRunner';

export const dynamic = 'force-dynamic';

export default async function LevelPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const lesson = await buildLevel(Number(n));
  if (!lesson) {
    return (
      <Card padding="lg" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Level not found.</p>
      </Card>
    );
  }
  return <FlashcardRunner lesson={lesson} />;
}
