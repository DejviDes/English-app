'use client';

import { useState } from 'react';
import { exportAttempts } from '@/app/actions/export';

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
      const data = await exportAttempts({
        from: from || undefined,
        to: to || undefined,
        only_wrong: onlyWrong,
      });
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
    <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-slate-500">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-xl bg-slate-50 px-3 py-2 text-slate-800 ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-500">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-xl bg-slate-50 px-3 py-2 text-slate-800 ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={onlyWrong} onChange={(e) => setOnlyWrong(e.target.checked)} />
        Only mistakes (wrong + almost)
      </label>
      <button
        onClick={run}
        disabled={pending}
        className="rounded-2xl bg-indigo-600 px-5 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-40"
      >
        {pending ? 'Exporting…' : 'Export attempts JSON'}
      </button>
      {count !== null && <p className="text-center text-sm text-slate-500">Exported {count} attempt(s).</p>}
    </div>
  );
}
