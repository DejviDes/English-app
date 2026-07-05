'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AppHeader, Badge, Card } from '@/components/ui/primitives';
import type { LevelNode, VocabLevels } from '@/lib/repos/levels';

function prettyTheme(t: string | null): string {
  if (!t) return 'General';
  return t.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

type Filter = 'all' | 'done' | 'todo';

function FilterTabs({ value, onChange }: { value: Filter; onChange: (v: Filter) => void }) {
  const tabs: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'todo', label: 'To-do' },
    { id: 'done', label: 'Done' },
  ];
  return (
    <div style={{ display: 'flex', gap: '4px', padding: '4px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-pill)' }}>
      {tabs.map((o) => {
        const on = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            style={{
              flex: 1, border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-pill)',
              padding: '8px 10px', fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-bold)',
              background: on ? 'var(--surface-card)' : 'transparent',
              color: on ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: on ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function LevelCard({ l }: { l: LevelNode }) {
  const done = l.status === 'done';
  return (
    <Link href={`/level/${l.n}`} style={{ display: 'block' }}>
      <Card padding="sm" interactive>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-bold)', letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
              Level {l.n}
            </p>
            <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--fw-extrabold)', color: 'var(--text-strong)', lineHeight: 'var(--leading-snug)' }}>
              {prettyTheme(l.theme)}
            </p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{l.words} words</p>
          </div>
          <Badge tone={done ? 'correct' : 'primary'} size="sm">{done ? 'Done ✓' : 'Start'}</Badge>
        </div>
      </Card>
    </Link>
  );
}

export default function LibraryView({ data }: { data: VocabLevels }) {
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(
    () =>
      data.levels.filter((l) => filter === 'all' || (filter === 'done' ? l.status === 'done' : l.status !== 'done')),
    [data.levels, filter],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-section)' }}>
      <AppHeader title="Library" subtitle="All your exercises" />

      {/* Vocabulary */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-extrabold)', color: 'var(--text-strong)' }}>📚 Vocabulary</p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{data.completedLevels}/{data.totalLevels} done</p>
        </div>
        <FilterTabs value={filter} onChange={setFilter} />
        {filtered.map((l) => (
          <LevelCard key={l.n} l={l} />
        ))}
        {filtered.length === 0 && (
          <Card padding="lg" style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Nothing here.</p>
          </Card>
        )}
      </div>

      {/* Grammar (future) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-extrabold)', color: 'var(--text-strong)' }}>📐 Grammar</p>
        <Card padding="md">
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            No grammar exercises yet — they&apos;ll appear here once created.
          </p>
        </Card>
      </div>
    </div>
  );
}
