'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader, Badge, Button } from '@/components/ui/primitives';
import { Select } from '@/components/ui/forms';
import type { DashboardStats } from '@/lib/repos/dashboard';

const SIZES = [10, 15, 20, 25];

const TYPE_LABEL: Record<string, string> = {
  vocab_multiple_choice: 'Multiple choice (easiest)',
  vocab_fill_blank: 'Fill in the blank',
  vocab_matching: 'Matching',
  grammar_fill_form: 'Grammar: verb form',
  grammar_choose_option: 'Grammar: choose option',
  grammar_fix_error: 'Grammar: fix the error',
};
const TYPE_ORDER = Object.keys(TYPE_LABEL);

export default function SessionStart({ stats }: { stats: DashboardStats }) {
  const router = useRouter();
  const [size, setSize] = useState(15);
  const [qtype, setQtype] = useState('mix');

  /* eslint-disable react-hooks/set-state-in-effect -- one-time load of saved prefs */
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

  const typeCounts = stats.typeCounts ?? {};
  const qtypeOptions = [
    { value: 'mix', label: 'Mix (all types)' },
    ...TYPE_ORDER.filter((t) => typeCounts[t]).map((t) => ({ value: t, label: `${TYPE_LABEL[t]} — ${typeCounts[t]}` })),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-section)' }}>
      <AppHeader
        title="Free practice"
        subtitle="A quick quiz on your words"
        right={
          <div style={{ display: 'flex', gap: '6px' }}>
            {stats.lastScore != null && <Badge tone="primary" icon={<span>🎯</span>}>{stats.lastScore}%</Badge>}
            <Badge tone="streak" icon={<span>🔥</span>}>{stats.streak}</Badge>
          </div>
        }
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

      <Button variant="primary" size="lg" block onClick={start}>Start quiz</Button>
    </div>
  );
}
