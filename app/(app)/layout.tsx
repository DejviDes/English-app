import BottomNav from '@/components/BottomNav';
import SyncProvider from '@/components/SyncProvider';

// Gated app shell: a centered mobile column, safe-area padding, and room for
// the fixed bottom nav. Middleware enforces the gate.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-app)' }}>
      <SyncProvider />
      <div
        className="lingua-app-column"
        style={{
          padding:
            'calc(env(safe-area-inset-top) + 16px) var(--pad-screen) calc(104px + env(safe-area-inset-bottom))',
        }}
      >
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
