'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppHeader, Badge, Button, Card } from '@/components/ui/primitives';
import { ProgressBar } from '@/components/ui/feedback';
import TheorySheet from '@/components/TheorySheet';
import type { GrammarLevelNode, GrammarTopicDetail } from '@/lib/repos/grammar';

const CIRCLE = 54;
const LINE_LEFT = 28;

function Circle({ status, n }: { status: GrammarLevelNode['status']; n: number }) {
  const base: React.CSSProperties = {
    width: CIRCLE, height: CIRCLE, flexShrink: 0, borderRadius: 'var(--radius-pill)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 'var(--fw-extrabold)', fontSize: 'var(--text-lg)', position: 'relative', zIndex: 1,
  };
  if (status === 'done') {
    return (
      <div style={{ ...base, background: 'linear-gradient(160deg,var(--green-500),var(--green-700))', color: '#fff', boxShadow: 'var(--shadow-primary)' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
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
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
    </div>
  );
}

function LevelRow({ slug, l }: { slug: string; l: GrammarLevelNode }) {
  const href = l.status !== 'locked' ? `/grammar/${slug}/${l.n}` : null;
  const sub = l.status === 'done' ? 'Dokončené ✓' : l.status === 'current' ? `${l.exercises} cvičení · začať` : 'Zamknuté';
  const inner = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '7px 0', opacity: l.status === 'locked' ? 0.6 : 1 }}>
      <Circle status={l.status} n={l.n} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-bold)', letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase', color: l.status === 'current' ? 'var(--primary)' : 'var(--text-faint)' }}>
          Level {l.n}
        </p>
        <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--fw-extrabold)', color: 'var(--text-strong)', lineHeight: 'var(--leading-snug)' }}>
          {l.skTitle ?? l.title}
        </p>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{sub}</p>
      </div>
    </div>
  );
  return href ? <Link href={href} style={{ display: 'block' }}>{inner}</Link> : inner;
}

export default function TopicMap({ detail }: { detail: GrammarTopicDetail }) {
  const router = useRouter();
  const [showTheory, setShowTheory] = useState(false);
  const done = detail.completedLevels;
  const total = detail.levels.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-section)' }}>
      <AppHeader
        title={<span style={{ fontSize: 'var(--text-xl)' }}>{detail.name}</span>}
        subtitle={detail.skName ?? undefined}
        onBack={() => router.push('/learn/grammar')}
        right={<Badge tone="neutral">{detail.cefr}</Badge>}
      />

      <Card padding="md">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--fw-bold)', color: 'var(--text-strong)' }}>{done} / {total} levelov</p>
          <Button variant="secondary" size="sm" onClick={() => setShowTheory(true)} iconLeft={
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
          }>Teória</Button>
        </div>
        <ProgressBar value={done} max={total || 1} height={12} tone={done === total ? 'correct' : 'primary'} />
      </Card>

      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: LINE_LEFT - 2, top: 8, bottom: 8, width: 4, borderRadius: 'var(--radius-pill)', background: 'var(--border-default)', zIndex: 0 }} />
        {detail.levels.map((l) => (
          <LevelRow key={l.id} slug={detail.slug} l={l} />
        ))}
      </div>

      {showTheory && (
        <TheorySheet name={detail.name} skName={detail.skName} cefr={detail.cefr} theory={detail.theory} onClose={() => setShowTheory(false)} />
      )}
    </div>
  );
}
