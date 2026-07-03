import { buildDayReview } from '@/lib/repos/journey';
import { Card } from '@/components/ui/primitives';
import LessonRunner from '@/components/LessonRunner';

export const dynamic = 'force-dynamic';

export default async function DayReviewPage({ params }: { params: Promise<{ day: string }> }) {
  const { day } = await params;
  const lesson = await buildDayReview(Number(day));
  if (!lesson) {
    return (
      <Card padding="lg" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Nothing to review.</p>
      </Card>
    );
  }
  return <LessonRunner lesson={lesson} />;
}
