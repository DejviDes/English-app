import { buildReview } from '@/lib/repos/levels';
import { Card } from '@/components/ui/primitives';
import FlashcardRunner from '@/components/FlashcardRunner';

export const dynamic = 'force-dynamic';

export default async function ReviewPage({ params }: { params: Promise<{ block: string }> }) {
  const { block } = await params;
  const lesson = await buildReview(Number(block));
  if (!lesson) {
    return (
      <Card padding="lg" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Nothing to review yet.</p>
      </Card>
    );
  }
  return <FlashcardRunner lesson={lesson} />;
}
