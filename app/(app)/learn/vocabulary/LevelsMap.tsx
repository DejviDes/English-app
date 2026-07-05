'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppHeader, Card } from '@/components/ui/primitives';
import { ProgressBar } from '@/components/ui/feedback';
import type { LevelNode, ReviewStatus, VocabLevels } from '@/lib/repos/levels';

function prettyTheme(t: string | null): string {
  if (!t) return 'General';
  return t.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

const LINE_LEFT = 30;
const CIRCLE = 58;

function Circle({ status, n }: { status: LevelNode['status']; n: number }) {
  const base: React.CSSProperties = {
    width: CIRCLE, height: CIRCLE, flexShrink: 0, borderRadius: 'var(--radius-pill)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 'var(--fw-extrabold)', fontSize: 'var(--text-lg)', position: 'relative', zIndex: 1,
  };
  if (status === 'done') {
    return (
      <div style={{ ...base, background: 'linear-gradient(160deg,var(--green-500),var(--green-700))', color: '#fff', boxShadow: 'var(--shadow-primary)' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      </div>
    );
  }
  if (status === 'current') {
    return (
      <div className="lingua-pulse" style={{ ...base, background: 'var(--surface-card)', color: 'var(--primary)', outline: '3px solid var(--primary)', outlineOffset: '-3px', boxShadow: 'var(--shadow-md)' }}>
        {n}
      </div>
    );
  }
  return (
    <div style={{ ...base, background: 'var(--surface-inset)', color: 'var(--text-faint)' }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
    </div>
  );
}

function LevelRow({ l }: { l: LevelNode }) {
  const href = l.status === 'current' ? `/level/${l.n}` : null;
  const sub = l.status === 'done' ? 'Completed ✓' : l.status === 'current' ? 'Tap to start' : 'Locked';
  const inner = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '7px 0', opacity: l.status === 'locked' ? 0.6 : 1 }}>
      <Circle status={l.status} n={l.n} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-bold)', letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase', color: l.status === 'current' ? 'var(--primary)' : 'var(--text-faint)' }}>
          Level {l.n}
        </p>
        <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--fw-extrabold)', color: 'var(--text-strong)', lineHeight: 'var(--leading-snug)' }}>
          {prettyTheme(l.theme)}
        </p>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{l.words} words · {sub}</p>
      </div>
    </div>
  );
  return href ? <Link href={href} style={{ display: 'block' }}>{inner}</Link> : inner;
}

function ReviewRow({ block, status }: { block: number; status: ReviewStatus }) {
  const inner = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '6px 0' }}>
      <div style={{ width: CIRCLE, flexShrink: 0, display: 'flex', justifyContent: 'center', fontSize: '28px', filter: status === 'locked' ? 'grayscale(1)' : 'none', opacity: status === 'locked' ? 0.5 : 1, zIndex: 1 }}>
        {status === 'locked' ? '🔒' : '🎁'}
      </div>
      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-bold)', color: status === 'locked' ? 'var(--text-faint)' : 'var(--primary)' }}>
        {status === 'done' ? `Review ${block} done ✓` : status === 'available' ? `Review ${block} — tap` : `Review ${block}`}
      </p>
    </div>
  );
  return status === 'available' ? <Link href={`/review/${block}`} style={{ display: 'block' }}>{inner}</Link> : inner;
}

export default function LevelsMap({ data }: { data: VocabLevels }) {
  const router = useRouter();
  const position = data.currentLevel ?? data.totalLevels;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-section)' }}>
      <AppHeader title="Vocabulary" onBack={() => router.push('/dashboard')} />

      <Card padding="md">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
          <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--fw-bold)', color: 'var(--text-strong)' }}>
            Level {position} of {data.totalLevels}
          </p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{data.completedLevels} completed</p>
        </div>
        <ProgressBar value={data.completedLevels} max={data.totalLevels} height={12} />
      </Card>

      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: LINE_LEFT - 2, top: 8, bottom: 8, width: 4, borderRadius: 'var(--radius-pill)', background: 'var(--border-default)', zIndex: 0 }} />
        {data.levels.map((l) => {
          const block = l.n / 5;
          return (
            <div key={l.n}>
              <LevelRow l={l} />
              {l.blockEnd && data.reviews[block] && <ReviewRow block={block} status={data.reviews[block]} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
