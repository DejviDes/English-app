'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppHeader, Badge, StartCard, Stat } from '@/components/ui/primitives';
import { InlineMessage } from '@/components/ui/feedback';
import { Select } from '@/components/ui/forms';
import InstallHint from '@/components/InstallHint';
import type { DashboardStats } from '@/lib/repos/dashboard';

const SIZES = [10, 15, 20, 25];

const QTYPES = [
  { value: 'mix', label: 'Mix (all types)' },
  { value: 'vocab_multiple_choice', label: 'Multiple choice — easiest' },
  { value: 'vocab_en_sk', label: 'EN → SK (type the answer)' },
  { value: 'vocab_sk_en', label: 'SK → EN (type the answer)' },
];

export default function DashboardView({ stats }: { stats: DashboardStats }) {
  const router = useRouter();
  const [size, setSize] = useState(15);
  const [qtype, setQtype] = useState('mix');

  /* eslint-disable react-hooks/set-state-in-effect -- one-time, hydration-safe load of saved prefs */
  useEffect(() => {
    const s = Number(localStorage.getItem('quiz-size'));
    const t = localStorage.getItem('quiz-type');
    if (SIZES.includes(s)) setSize(s);
    if (t && QTYPES.some((o) => o.value === t)) setQtype(t);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function pickSize(n: number) {
    setSize(n);
    localStorage.setItem('quiz-size', String(n));
  }
  function pickType(t: string) {
    setQtype(t);
    localStorage.setItem('quiz-type', t);
  }
  function start() {
    router.push(`/session?n=${size}${qtype !== 'mix' ? `&type=${qtype}` : ''}`);
  }

  const nothing = stats.totalExercises === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-section)' }}>
      <InstallHint />

      <AppHeader
        title="English"
        right={
          <div style={{ display: 'flex', gap: '6px' }}>
            {stats.lastScore != null && (
              <Badge tone="primary" icon={<span>🎯</span>}>{stats.lastScore}%</Badge>
            )}
            <Badge tone="streak" icon={<span>🔥</span>}>{stats.streak}</Badge>
          </div>
        }
      />

      <StartCard
        due={stats.toReview}
        newItems={stats.newItems}
        subtitle={`${size}-question quiz`}
        onClick={start}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-bold)', color: 'var(--text-muted)' }}>Quiz length</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          {SIZES.map((n) => {
            const on = n === size;
            return (
              <button
                key={n}
                type="button"
                onClick={() => pickSize(n)}
                style={{
                  flex: 1, border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-md)', padding: '12px 0',
                  fontSize: 'var(--text-base)', fontWeight: 'var(--fw-bold)',
                  background: on ? 'var(--primary)' : 'var(--surface-card)',
                  color: on ? '#fff' : 'var(--text-body)',
                  boxShadow: on ? 'var(--shadow-primary)' : 'var(--shadow-sm)',
                  outline: on ? 'none' : '1px solid var(--border-subtle)', outlineOffset: '-1px',
                  transition: 'background var(--dur-fast) var(--ease-out)',
                }}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-bold)', color: 'var(--text-muted)' }}>Question type</p>
        <Select options={QTYPES} value={qtype} onChange={(e) => pickType(e.target.value)} />
      </div>

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
