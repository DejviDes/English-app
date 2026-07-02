'use client';

import { useMemo, useState } from 'react';

export interface MatchPair {
  left: string;
  right: string;
}

/** Deterministic-enough shuffle (Fisher–Yates) computed once per mount. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MatchingInput({
  pairs,
  disabled,
  onSubmit,
}: {
  pairs: MatchPair[];
  disabled?: boolean;
  onSubmit: (answer: string) => void;
}) {
  const rights = useMemo(() => shuffle(pairs.map((p) => p.right)), [pairs]);
  const [choice, setChoice] = useState<Record<string, string>>({});

  const allChosen = pairs.every((p) => choice[p.left]);

  return (
    <div className="flex flex-col gap-3">
      {pairs.map((p) => (
        <div key={p.left} className="flex items-center gap-3">
          <span className="flex-1 rounded-2xl bg-white px-4 py-3 font-medium text-slate-700 shadow-sm ring-1 ring-slate-100">
            {p.left}
          </span>
          <select
            disabled={disabled}
            value={choice[p.left] ?? ''}
            onChange={(e) => setChoice((c) => ({ ...c, [p.left]: e.target.value }))}
            className="flex-1 rounded-2xl bg-white px-4 py-3 text-slate-700 shadow-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="" disabled>
              choose…
            </option>
            {rights.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      ))}
      <button
        disabled={disabled || !allChosen}
        onClick={() => onSubmit(JSON.stringify(choice))}
        className="rounded-2xl bg-indigo-600 px-5 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-40"
      >
        Check
      </button>
    </div>
  );
}
