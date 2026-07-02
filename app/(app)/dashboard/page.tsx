import Link from 'next/link';
import { getDashboard } from '@/lib/repos/dashboard';
import InstallHint from '@/components/InstallHint';

export const dynamic = 'force-dynamic';

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-100">
      <p className="text-3xl font-bold text-slate-800">{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const s = await getDashboard();

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-slate-50 px-4 pt-[calc(env(safe-area-inset-top)+2.5rem)] pb-10">
      <InstallHint />
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">English</h1>
        <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-600 ring-1 ring-orange-200">
          🔥 {s.streak}
        </span>
      </header>

      <Link
        href="/session"
        className="mb-6 flex flex-col items-center justify-center gap-1 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 p-8 text-white shadow-lg shadow-indigo-200 transition active:scale-[0.99]"
      >
        <span className="text-2xl font-bold">Start session</span>
        <span className="text-sm text-indigo-100">
          {s.toReview} due · {s.newItems} new
        </span>
      </Link>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Words" value={s.totalWords} />
        <Stat label="Topics" value={s.totalTopics} />
        <Stat label="Exercises" value={s.totalExercises} />
      </div>

      {s.dueWithoutExercise > 0 && (
        <div className="mt-6 rounded-3xl bg-amber-50 p-5 text-sm text-amber-800 ring-1 ring-amber-200">
          <p className="font-semibold">{s.dueWithoutExercise} due item(s) have no exercises.</p>
          <p className="mt-1 opacity-80">
            Generate a batch in a Claude chat (see the generation prompt) and{' '}
            <Link href="/import" className="font-medium underline">
              import
            </Link>{' '}
            it.
          </p>
        </div>
      )}

      {s.totalExercises === 0 && (
        <div className="mt-6 rounded-3xl bg-white p-5 text-center text-sm text-slate-500 ring-1 ring-slate-100">
          No content yet — <Link href="/import" className="font-medium text-indigo-600 underline">import your first batch</Link>.
        </div>
      )}
    </main>
  );
}
