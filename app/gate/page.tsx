'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GatePage() {
  const router = useRouter();
  const [secret, setSecret] = useState('');
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(false);
    try {
      const res = await fetch('/api/gate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ secret }),
      });
      if (res.ok) {
        router.replace('/');
        router.refresh();
      } else {
        setError(true);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={onSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100"
      >
        <h1 className="text-center text-xl font-semibold text-slate-800">English</h1>
        <input
          type="password"
          autoFocus
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Enter secret"
          className="rounded-2xl bg-slate-50 px-5 py-4 text-lg text-slate-800 ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-indigo-300"
        />
        {error && <p className="text-center text-sm text-rose-600">Wrong secret.</p>}
        <button
          type="submit"
          disabled={pending || !secret}
          className="rounded-2xl bg-indigo-600 px-5 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-40"
        >
          {pending ? 'Unlocking…' : 'Unlock'}
        </button>
      </form>
    </main>
  );
}
