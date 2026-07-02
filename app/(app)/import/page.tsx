import ImportForm from './ImportForm';

export default function ImportPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-md bg-slate-50 px-4 py-10">
      <h1 className="mb-6 text-center text-sm font-semibold uppercase tracking-widest text-slate-400">Import</h1>
      <ImportForm />
    </main>
  );
}
