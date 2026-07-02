'use client';

import { useState } from 'react';
import { importPayload, type ImportReport } from '@/app/actions/import';

export default function ImportForm() {
  const [text, setText] = useState('');
  const [report, setReport] = useState<ImportReport | null>(null);
  const [pending, setPending] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setText(await file.text());
    setReport(null);
  }

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
    <div className="flex flex-col gap-4">
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-slate-200 bg-white p-8 text-center text-slate-500 transition hover:border-indigo-300">
        <span className="text-sm font-medium">Choose a JSON file</span>
        <span className="text-xs text-slate-400">exercises · words · grammar_topics</span>
        <input type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
      </label>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="…or paste JSON here"
        rows={8}
        className="rounded-2xl bg-white p-4 font-mono text-xs text-slate-700 shadow-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-indigo-300"
      />

      <button
        onClick={run}
        disabled={pending || !text.trim()}
        className="rounded-2xl bg-indigo-600 px-5 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-40"
      >
        {pending ? 'Importing…' : 'Import'}
      </button>

      {report && (
        <div
          className={`rounded-2xl p-5 text-sm ring-1 ${
            report.ok ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-rose-50 text-rose-800 ring-rose-200'
          }`}
        >
          {report.ok ? (
            <>
              <p className="font-semibold">
                Imported {report.inserted} / {report.received} ({report.kind})
              </p>
              <p className="mt-1 opacity-80">
                {report.skipped_duplicates ?? 0} duplicate(s) skipped
                {report.unresolved ? `, ${report.unresolved} unresolved` : ''}.
              </p>
            </>
          ) : (
            <p className="font-semibold">{report.error}</p>
          )}
          {report.issues && report.issues.length > 0 && (
            <ul className="mt-2 list-disc pl-5">
              {report.issues.slice(0, 20).map((i, n) => (
                <li key={n}>
                  <code>{i.path || '(root)'}</code>: {i.message}
                </li>
              ))}
            </ul>
          )}
          {report.warnings && report.warnings.length > 0 && (
            <ul className="mt-2 list-disc pl-5 opacity-80">
              {report.warnings.slice(0, 20).map((w, n) => (
                <li key={n}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
