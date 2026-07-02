import BottomNav from '@/components/BottomNav';

// Route group for gated app screens. Middleware enforces the gate.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-16">
      {children}
      <BottomNav />
    </div>
  );
}
