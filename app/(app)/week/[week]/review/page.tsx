import { buildWeekReview } from '@/lib/repos/journey';
import { Card } from '@/components/ui/primitives';
import LessonRunner from '@/components/LessonRunner';

export const dynamic = 'force-dynamic';

export default async function WeekReviewPage({ params }: { params: Promise<{ week: string }> }) {
  const { week } = await params;
  const lesson = await buildWeekReview(Number(week));
  if (!lesson) {
    return (
      <Card padding="lg" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Nothing to review yet.</p>
      </Card>
    );
  }
  return <LessonRunner lesson={lesson} />;
}
