'use client';

import { useState } from 'react';
import { importPayload, type ImportReport } from '@/app/actions/import';
import { AppHeader, Button } from '@/components/ui/primitives';
import { InlineMessage } from '@/components/ui/feedback';
import { FileDropzone, Textarea } from '@/components/ui/forms';

export default function ImportForm() {
  const [text, setText] = useState('');
  const [report, setReport] = useState<ImportReport | null>(null);
  const [pending, setPending] = useState(false);

  async function run() {
    if (!text.trim() || pending) return;
    setPending(true);
    try {
      setReport(await importPayload(text));
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <AppHeader title="Import" subtitle="Add a generated batch" />

      <FileDropzone onFile={(f) => f.text().then((t) => { setText(t); setReport(null); })} />

      <Textarea mono rows={7} placeholder="…or paste JSON here" value={text} onChange={(e) => { setText(e.target.value); setReport(null); }} />

      <Button variant="primary" size="lg" block onClick={run} disabled={pending || !text.trim()}>
        {pending ? 'Importing…' : 'Import'}
      </Button>

      {report &&
        (report.ok ? (
          <InlineMessage
            tone="success"
            title={`Imported ${report.inserted} / ${report.received} (${report.kind})`}
            icon={<span style={{ fontSize: '18px' }}>✅</span>}
          >
            <span>
              {report.skipped_duplicates ?? 0} duplicate(s) skipped
              {report.unresolved ? `, ${report.unresolved} unresolved` : ''}
              {report.exercises_created != null ? `. ${report.exercises_created} exercise(s) auto-created` : ''}.
            </span>
          </InlineMessage>
        ) : (
          <InlineMessage tone="error" title={report.error} icon={<span style={{ fontSize: '18px' }}>⚠️</span>}>
            {report.issues && report.issues.length > 0 && (
              <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                {report.issues.slice(0, 20).map((i, n) => (
                  <li key={n}>
                    <code>{i.path || '(root)'}</code>: {i.message}
                  </li>
                ))}
              </ul>
            )}
          </InlineMessage>
        ))}

      {report?.warnings && report.warnings.length > 0 && (
        <InlineMessage tone="warning" title="Warnings">
          <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
            {report.warnings.slice(0, 20).map((w, n) => (
              <li key={n}>{w}</li>
            ))}
          </ul>
        </InlineMessage>
      )}
    </div>
  );
}
