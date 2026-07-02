'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppHeader, Badge, StartCard, Stat } from '@/components/ui/primitives';
import { InlineMessage } from '@/components/ui/feedback';
import InstallHint from '@/components/InstallHint';
import type { DashboardStats } from '@/lib/repos/dashboard';

export default function DashboardView({ stats }: { stats: DashboardStats }) {
  const router = useRouter();
  const nothing = stats.totalExercises === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-section)' }}>
      <InstallHint />

      <AppHeader title="English" right={<Badge tone="streak" icon={<span>🔥</span>}>{stats.streak}</Badge>} />

      <StartCard due={stats.toReview} newItems={stats.newItems} onClick={() => router.push('/session')} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
        <Stat value={stats.totalWords} label="Words" />
        <Stat value={stats.totalTopics} label="Topics" />
        <Stat value={stats.totalExercises} label="Exercises" />
      </div>

      {nothing ? (
        <InlineMessage tone="info" title="No content yet" icon={<span style={{ fontSize: '18px' }}>📦</span>}>
          <span>
            Generate a batch in a Claude chat, then{' '}
            <Link href="/import" style={{ fontWeight: 'var(--fw-bold)', textDecoration: 'underline' }}>import</Link> it.
          </span>
        </InlineMessage>
      ) : (
        stats.dueWithoutExercise > 0 && (
          <InlineMessage
            tone="warning"
            title={`${stats.dueWithoutExercise} due item(s) have no exercises.`}
            icon={<span style={{ fontSize: '18px' }}>💡</span>}
          >
            <span>
              Generate a batch (see the generation prompt) and{' '}
              <Link href="/import" style={{ fontWeight: 'var(--fw-bold)', textDecoration: 'underline' }}>import</Link> it.
            </span>
          </InlineMessage>
        )
      )}
    </div>
  );
}
