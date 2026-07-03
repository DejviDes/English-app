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

const TYPE_LABEL: Record<string, string> = {
  vocab_multiple_choice: 'Multiple choice (easiest)',
  vocab_en_sk: 'EN → SK (type the answer)',
  vocab_sk_en: 'SK → EN (type the answer)',
  vocab_fill_blank: 'Fill in the blank',
  vocab_matching: 'Matching',
  grammar_fill_form: 'Grammar: verb form',
  grammar_choose_option: 'Grammar: choose option',
  grammar_fix_error: 'Grammar: fix the error',
};
const TYPE_ORDER = [
  'vocab_multiple_choice',
  'vocab_en_sk',
  'vocab_sk_en',
  'vocab_fill_blank',
  'vocab_matching',
  'grammar_fill_form',
  'grammar_choose_option',
  'grammar_fix_error',
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
    if (t && (t === 'mix' || t in TYPE_LABEL)) setQtype(t);
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
  const qtypeOptions = [
    { value: 'mix', label: 'Mix (all types)' },
    ...TYPE_ORDER.filter((t) => stats.typeCounts[t]).map((t) => ({
      value: t,
      label: `${TYPE_LABEL[t]} — ${stats.typeCounts[t]}`,
    })),
  ];

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
        <Select options={qtypeOptions} value={qtype} onChange={(e) => pickType(e.target.value)} />
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
