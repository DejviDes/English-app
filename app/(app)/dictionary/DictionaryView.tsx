'use client';

import { useEffect, useRef, useState } from 'react';
import { AppHeader, Badge, Button, Card } from '@/components/ui/primitives';
import { Input, Select } from '@/components/ui/forms';
import { searchWords, type DictStatusFilter } from '@/app/actions/dictionary';
import type { DictRow, WordStatus } from '@/lib/dictionary';
import { SpeakButton } from '@/components/SpeakButton';

const STATUS: Record<WordStatus, { tone: 'neutral' | 'almost' | 'primary' | 'correct'; label: string }> = {
  new: { tone: 'neutral', label: 'New' },
  learning: { tone: 'almost', label: 'Learning' },
  known: { tone: 'correct', label: 'Vedel ✓' },
};

const STATUS_TABS: { id: DictStatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'known', label: 'Known' },
  { id: 'unknown', label: 'New' },
];

const CEFR_OPTIONS = [
  { value: 'all', label: 'All levels' },
  { value: 'A2', label: 'A2' },
  { value: 'B1', label: 'B1' },
  { value: 'B2', label: 'B2' },
  { value: 'C1', label: 'C1' },
];

const SearchIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

function StatusTabs({ value, onChange }: { value: DictStatusFilter; onChange: (v: DictStatusFilter) => void }) {
  return (
    <div style={{ display: 'flex', gap: '4px', padding: '4px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-pill)' }}>
      {STATUS_TABS.map((o) => {
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

function WordRow({ r }: { r: DictRow }) {
  return (
    <Card padding="sm">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <SpeakButton text={r.term} size={34} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--fw-extrabold)', color: 'var(--text-strong)' }}>{r.term}</p>
          {r.ipa && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>/{r.ipa}/</p>}
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>{r.translation}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
          <Badge tone={STATUS[r.status].tone} size="sm">{STATUS[r.status].label}</Badge>
          {r.cefr && <Badge tone="neutral" size="sm">{r.cefr}</Badge>}
        </div>
      </div>
    </Card>
  );
}

export default function DictionaryView({
  initialRows,
  initialTotal,
}: {
  initialRows: DictRow[];
  initialTotal: number;
}) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<DictStatusFilter>('all');
  const [cefr, setCefr] = useState('all');
  const [rows, setRows] = useState(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const firstRender = useRef(true);

  // Debounced refetch when the query or any filter changes.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    let active = true;
    setLoading(true);
    const id = setTimeout(() => {
      searchWords({ q, offset: 0, status, cefr }).then((res) => {
        if (!active) return;
        setRows(res.rows);
        setTotal(res.total);
        setLoading(false);
      });
    }, 300);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [q, status, cefr]);

  async function loadMore() {
    setLoading(true);
    const res = await searchWords({ q, offset: rows.length, status, cefr });
    setRows((r) => {
      const seen = new Set(r.map((x) => x.id));
      return [...r, ...res.rows.filter((x) => !seen.has(x.id))];
    });
    setTotal(res.total);
    setLoading(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-section)' }}>
      <AppHeader title="Words" subtitle={`${total} in your dictionary`} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Input placeholder="Search English or Slovak…" value={q} onChange={(e) => setQ(e.target.value)} iconLeft={SearchIcon} />
        <StatusTabs value={status} onChange={setStatus} />
        <Select options={CEFR_OPTIONS} value={cefr} onChange={(e) => setCefr(e.target.value)} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {rows.length === 0 ? (
          <Card padding="lg" style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              {loading ? 'Searching…' : 'No matches.'}
            </p>
          </Card>
        ) : (
          rows.map((r) => <WordRow key={r.id} r={r} />)
        )}
      </div>

      {rows.length < total && (
        <Button variant="secondary" size="lg" block onClick={loadMore} disabled={loading}>
          {loading ? 'Loading…' : `Load more (${total - rows.length})`}
        </Button>
      )}
    </div>
  );
}
