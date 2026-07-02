'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/dashboard', label: 'Home', icon: '🏠' },
  { href: '/session', label: 'Drill', icon: '🎯' },
  { href: '/add-word', label: 'Add', icon: '➕' },
  { href: '/import', label: 'Import', icon: '📥' },
  { href: '/export', label: 'Export', icon: '📤' },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {ITEMS.map((it) => {
          const active = pathname === it.href;
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition ${
                  active ? 'text-indigo-600' : 'text-slate-400'
                }`}
              >
                <span className="text-lg">{it.icon}</span>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
