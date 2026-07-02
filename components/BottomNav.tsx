'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type IconKey = 'home' | 'drill' | 'library' | 'add' | 'import' | 'export';

const ICONS: Record<IconKey, React.ReactNode> = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9 21v-6h6v6" /></>,
  drill: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.6" fill="currentColor" /></>,
  library: <><path d="m16 6 4 14" /><path d="M12 6v14" /><path d="M8 8v12" /><path d="M4 4v16" /></>,
  add: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  import: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>,
  export: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>,
};

const ITEMS: { href: string; label: string; icon: IconKey }[] = [
  { href: '/dashboard', label: 'Home', icon: 'home' },
  { href: '/session', label: 'Drill', icon: 'drill' },
  { href: '/library', label: 'Library', icon: 'library' },
  { href: '/add-word', label: 'Add', icon: 'add' },
  { href: '/import', label: 'Import', icon: 'import' },
  { href: '/export', label: 'Export', icon: 'export' },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      style={{
        position: 'fixed', insetInline: 0, bottom: 0, zIndex: 10,
        borderTop: '1px solid var(--border-default)',
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <ul style={{ listStyle: 'none', margin: 0, padding: '6px 4px 8px', display: 'flex', justifyContent: 'space-around', alignItems: 'stretch', maxWidth: 'var(--app-max-width)', marginInline: 'auto' }}>
        {ITEMS.map((it) => {
          const on = pathname === it.href;
          return (
            <li key={it.href} style={{ flex: 1 }}>
              <Link
                href={it.href}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', width: '100%', padding: '6px 2px', color: on ? 'var(--primary)' : 'var(--text-faint)', fontSize: '11px', fontWeight: 'var(--fw-bold)', transition: 'color var(--dur-fast) var(--ease-out)' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={on ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round">
                  {ICONS[it.icon]}
                </svg>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
