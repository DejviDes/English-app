import ExportControls from './ExportControls';

export default function ExportPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-md bg-slate-50 px-4 py-10">
      <h1 className="mb-6 text-center text-sm font-semibold uppercase tracking-widest text-slate-400">Export</h1>
      <p className="mb-4 text-center text-sm text-slate-500">
        Download your attempts as JSON to analyze in a Claude chat.
      </p>
      <ExportControls />
    </main>
  );
}
