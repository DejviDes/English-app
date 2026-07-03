'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type IconKey = 'home' | 'drill' | 'dictionary' | 'library' | 'settings';

const ICONS: Record<IconKey, React.ReactNode> = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9 21v-6h6v6" /></>,
  drill: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.6" fill="currentColor" /></>,
  dictionary: <><path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></>,
  library: <><path d="m16 6 4 14" /><path d="M12 6v14" /><path d="M8 8v12" /><path d="M4 4v16" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
};

const ITEMS: { href: string; label: string; icon: IconKey }[] = [
  { href: '/dashboard', label: 'Home', icon: 'home' },
  { href: '/session', label: 'Drill', icon: 'drill' },
  { href: '/dictionary', label: 'Words', icon: 'dictionary' },
  { href: '/library', label: 'Library', icon: 'library' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
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
