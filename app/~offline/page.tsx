export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
      <p className="text-4xl">📶</p>
      <h1 className="text-xl font-semibold text-slate-800">You&apos;re offline</h1>
      <p className="max-w-xs text-sm text-slate-500">
        This page isn&apos;t cached yet. Any answers you gave while offline are saved and will sync
        when you&apos;re back online.
      </p>
    </main>
  );
}
