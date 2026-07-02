export default function OfflinePage() {
  return (
    <main style={{ minHeight: '100dvh', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '24px', textAlign: 'center' }}>
      <p style={{ fontSize: '44px' }}>📶</p>
      <h1 style={{ fontSize: 'var(--text-xl)' }}>You&apos;re offline</h1>
      <p style={{ maxWidth: '280px', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
        This page isn&apos;t cached yet. Answers you gave offline are saved and will sync when you&apos;re
        back online.
      </p>
    </main>
  );
}
