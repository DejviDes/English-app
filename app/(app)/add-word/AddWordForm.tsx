'use client';

import { useState } from 'react';
import { addWord } from '@/app/actions/words';

const POS = ['noun', 'verb', 'adjective', 'adverb', 'phrase', 'phrasal_verb', 'idiom', 'other'];
const CEFR = ['A2', 'B1', 'B2', 'C1'];

export default function AddWordForm() {
  const [term, setTerm] = useState('');
  const [translation, setTranslation] = useState('');
  const [pos, setPos] = useState('noun');
  const [cefr, setCefr] = useState('B2');
  const [example, setExample] = useState('');
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    try {
      const r = await addWord({
        term,
        translation,
        part_of_speech: pos,
        cefr_level: cefr,
        example_sentence: example || null,
      });
      if (r.ok) {
        setMsg({ ok: true, text: r.duplicate ? 'Already existed (skipped).' : `Added "${term}".` });
        if (!r.duplicate) {
          setTerm('');
          setTranslation('');
          setExample('');
        }
      } else {
        setMsg({ ok: false, text: r.error ?? 'Failed.' });
      }
    } finally {
      setPending(false);
    }
  }

  const input =
    'rounded-2xl bg-white px-4 py-3 text-slate-800 shadow-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-indigo-300';

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input className={input} placeholder="Term (EN)" value={term} onChange={(e) => setTerm(e.target.value)} />
      <input
        className={input}
        placeholder="Translation (SK)"
        value={translation}
        onChange={(e) => setTranslation(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <select className={input} value={pos} onChange={(e) => setPos(e.target.value)}>
          {POS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select className={input} value={cefr} onChange={(e) => setCefr(e.target.value)}>
          {CEFR.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <input
        className={input}
        placeholder="Example sentence (optional)"
        value={example}
        onChange={(e) => setExample(e.target.value)}
      />
      <button
        type="submit"
        disabled={pending || !term.trim() || !translation.trim()}
        className="rounded-2xl bg-indigo-600 px-5 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-40"
      >
        {pending ? 'Saving…' : 'Add word'}
      </button>
      {msg && (
        <p className={`text-center text-sm ${msg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{msg.text}</p>
      )}
    </form>
  );
}
