import Link from 'next/link';
import { AppHeader, Badge, Card } from '@/components/ui/primitives';
import InstallHint from '@/components/InstallHint';
import type { Section } from '@/lib/repos/levels';

const Chevron = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

function SectionCard({ s }: { s: Section }) {
  const disabled = !s.href;
  const inner = (
    <Card padding="md" interactive={!disabled} style={disabled ? { opacity: 0.55 } : undefined}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '30px' }}>{s.emoji}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-extrabold)', color: 'var(--text-strong)' }}>{s.title}</p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{s.subtitle}</p>
          {s.progress && s.progress.total > 0 && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--primary)', fontWeight: 'var(--fw-bold)', marginTop: '4px' }}>
              {s.progress.done} / {s.progress.total} levels
            </p>
          )}
        </div>
        {!disabled && Chevron}
      </div>
    </Card>
  );
  return disabled ? inner : <Link href={s.href!} style={{ display: 'block' }}>{inner}</Link>;
}

export default function SectionsView({
  sections,
  header,
}: {
  sections: Section[];
  header: { streak: number; lastScore: number | null };
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-section)' }}>
      <InstallHint />
      <AppHeader
        title="English"
        right={
          <div style={{ display: 'flex', gap: '6px' }}>
            {header.lastScore != null && <Badge tone="primary" icon={<span>🎯</span>}>{header.lastScore}%</Badge>}
            <Badge tone="streak" icon={<span>🔥</span>}>{header.streak}</Badge>
          </div>
        }
      />
      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-bold)', color: 'var(--text-muted)' }}>
        What do you want to learn?
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sections.map((s) => (
          <SectionCard key={s.key} s={s} />
        ))}
      </div>
    </div>
  );
}
