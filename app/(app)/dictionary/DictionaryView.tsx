'use client';

import { useEffect, useRef, useState } from 'react';
import { AppHeader, Badge, Button, Card } from '@/components/ui/primitives';
import { Input } from '@/components/ui/forms';
import { searchWords } from '@/app/actions/dictionary';
import type { DictRow } from '@/lib/dictionary';

const SearchIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

function WordRow({ r }: { r: DictRow }) {
  return (
    <Card padding="sm">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--fw-extrabold)', color: 'var(--text-strong)' }}>{r.term}</p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>{r.translation}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
          {r.cefr && <Badge tone="primary" size="sm">{r.cefr}</Badge>}
          {r.theme && <Badge tone="neutral" size="sm">{r.theme}</Badge>}
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
  const [rows, setRows] = useState(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const firstRender = useRef(true);

  // Debounced search on query change.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    let active = true;
    setLoading(true);
    const id = setTimeout(() => {
      searchWords({ q, offset: 0 }).then((res) => {
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
  }, [q]);

  async function loadMore() {
    setLoading(true);
    const res = await searchWords({ q, offset: rows.length });
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

      <Input placeholder="Search English or Slovak…" value={q} onChange={(e) => setQ(e.target.value)} iconLeft={SearchIcon} />

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
