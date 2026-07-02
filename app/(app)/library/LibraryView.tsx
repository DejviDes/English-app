'use client';

import { useEffect, useRef, useState } from 'react';
import { AppHeader, Badge, Button, Card, Stat } from '@/components/ui/primitives';
import { Select } from '@/components/ui/forms';
import { getLibraryPage } from '@/app/actions/library';
import type { LibraryFilters, LibraryRow, LibrarySummary } from '@/lib/repos/library';

const TYPE_LABEL: Record<string, string> = {
  vocab_en_sk: 'EN → SK',
  vocab_sk_en: 'SK → EN',
  vocab_fill_blank: 'Fill blank',
  vocab_multiple_choice: 'Choose',
  vocab_matching: 'Match',
  grammar_fill_form: 'Verb form',
  grammar_choose_option: 'Grammar',
  grammar_fix_error: 'Fix error',
};

const TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  ...Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label })),
];

type Status = LibraryFilters['status'];

function Segmented({ value, onChange }: { value: Status; onChange: (v: Status) => void }) {
  const opts: { id: Status; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'todo', label: 'To-do' },
    { id: 'done', label: 'Done' },
  ];
  return (
    <div style={{ display: 'flex', gap: '4px', padding: '4px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-pill)' }}>
      {opts.map((o) => {
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

function Row({ r }: { r: LibraryRow }) {
  return (
    <Card padding="sm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <Badge tone="primary" size="sm">{TYPE_LABEL[r.type] ?? r.type}</Badge>
          {r.cefr && <Badge tone="neutral" size="sm">{r.cefr}</Badge>}
          <span style={{ flex: 1 }} />
          {r.done ? (
            <Badge tone="correct" size="sm" icon={<span>✓</span>}>{r.timesUsed}×</Badge>
          ) : (
            <Badge tone="neutral" size="sm">New</Badge>
          )}
        </div>
        <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--fw-bold)', color: 'var(--text-strong)', lineHeight: 'var(--leading-snug)' }}>
          {r.label}
        </p>
        {r.target && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>→ {r.target}</p>}
      </div>
    </Card>
  );
}

export default function LibraryView({
  summary,
  initialRows,
  initialTotal,
}: {
  summary: LibrarySummary;
  initialRows: LibraryRow[];
  initialTotal: number;
}) {
  const [status, setStatus] = useState<Status>('all');
  const [type, setType] = useState('all');
  const [rows, setRows] = useState(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    let active = true;
    setLoading(true);
    getLibraryPage({ status, type, offset: 0 }).then((res) => {
      if (!active) return;
      setRows(res.rows);
      setTotal(res.total);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [status, type]);

  async function loadMore() {
    setLoading(true);
    const res = await getLibraryPage({ status, type, offset: rows.length });
    setRows((r) => [...r, ...res.rows]);
    setTotal(res.total);
    setLoading(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-section)' }}>
      <AppHeader title="Library" subtitle="Your exercise stock" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
        <Stat value={summary.total} label="Total" />
        <Stat value={summary.done} label="Done" tone="primary" />
        <Stat value={summary.todo} label="To-do" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Segmented value={status} onChange={setStatus} />
        <Select options={TYPE_OPTIONS} value={type} onChange={(e) => setType(e.target.value)} />
      </div>

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
        Showing {rows.length} of {total}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {rows.length === 0 ? (
          <Card padding="lg" style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Nothing here.</p>
          </Card>
        ) : (
          rows.map((r) => <Row key={r.id} r={r} />)
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
