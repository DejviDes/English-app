import Link from 'next/link';
import { AppHeader, Card } from '@/components/ui/primitives';
import LogoutButton from './LogoutButton';

const ITEMS = [
  { href: '/add-word', icon: '➕', title: 'Add word', desc: 'Add a single word by hand' },
  { href: '/import', icon: '📥', title: 'Import', desc: 'Upload a generated JSON batch (words or exercises)' },
  { href: '/export', icon: '📤', title: 'Export attempts', desc: 'Download your attempts as JSON for analysis' },
];

const Chevron = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export default function SettingsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-section)' }}>
      <AppHeader title="Settings" subtitle="Manage your data" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {ITEMS.map((it) => (
          <Link key={it.href} href={it.href}>
            <Card padding="sm" interactive>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '22px' }}>{it.icon}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--fw-bold)', color: 'var(--text-strong)' }}>{it.title}</p>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{it.desc}</p>
                </div>
                {Chevron}
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <LogoutButton />
    </div>
  );
}
