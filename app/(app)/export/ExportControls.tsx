'use client';

import { useState } from 'react';
import { exportAttempts } from '@/app/actions/export';
import { AppHeader, Button, Card } from '@/components/ui/primitives';
import { InlineMessage } from '@/components/ui/feedback';
import { Checkbox, Input } from '@/components/ui/forms';

export default function ExportControls() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [onlyWrong, setOnlyWrong] = useState(false);
  const [pending, setPending] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  async function run() {
    setPending(true);
    setCount(null);
    try {
      const data = await exportAttempts({ from: from || undefined, to: to || undefined, only_wrong: onlyWrong });
      setCount(data.summary.total);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attempts_${data.exported_at.slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <AppHeader title="Export" subtitle="Download your attempts as JSON" />
      <Card padding="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Checkbox label="Only mistakes (wrong + almost)" checked={onlyWrong} onChange={(e) => setOnlyWrong(e.target.checked)} />
          <Button variant="primary" size="lg" block onClick={run} disabled={pending}>
            {pending ? 'Exporting…' : 'Export attempts JSON'}
          </Button>
          {count !== null && (
            <InlineMessage tone="success" title={`Exported ${count} attempt(s).`} icon={<span style={{ fontSize: '18px' }}>📤</span>}>
              Paste it into a Claude chat for error analysis.
            </InlineMessage>
          )}
        </div>
      </Card>
    </div>
  );
}
