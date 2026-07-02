import BottomNav from '@/components/BottomNav';
import SyncProvider from '@/components/SyncProvider';

// Route group for gated app screens. Middleware enforces the gate.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-16">
      <SyncProvider />
      {children}
      <BottomNav />
    </div>
  );
}
