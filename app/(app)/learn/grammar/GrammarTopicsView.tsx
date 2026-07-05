'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppHeader, Badge, Card } from '@/components/ui/primitives';
import { ProgressBar } from '@/components/ui/feedback';
import TheorySheet from '@/components/TheorySheet';
import type { GrammarTopicCard } from '@/lib/repos/grammar';

function InfoButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Teória"
      style={{
        flexShrink: 0, width: 38, height: 38, borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer',
        background: 'var(--primary-soft)', color: 'var(--primary-soft-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'inset 0 0 0 1px var(--primary-ring)',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
      </svg>
    </button>
  );
}

export default function GrammarTopicsView({ topics }: { topics: GrammarTopicCard[] }) {
  const router = useRouter();
  const [theory, setTheory] = useState<GrammarTopicCard | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-section)' }}>
      <AppHeader title="Grammar" subtitle="Časy — teória a cvičenia" onBack={() => router.push('/dashboard')} />

      {topics.length === 0 ? (
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px' }}>📐</div>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: 'var(--text-sm)' }}>Zatiaľ žiadne časy.</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {topics.map((t) => {
            const done = t.totalLevels > 0 && t.completedLevels === t.totalLevels;
            return (
              <Card key={t.slug} padding="sm" interactive>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Link href={`/grammar/${t.slug}`} style={{ display: 'block', minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--fw-extrabold)', color: 'var(--text-strong)', lineHeight: 'var(--leading-snug)' }}>
                        {t.name}
                      </p>
                      <Badge tone="neutral" size="sm">{t.cefr}</Badge>
                      {done && <Badge tone="correct" size="sm">✓</Badge>}
                    </div>
                    {t.skName && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{t.skName}</p>}
                    <div style={{ marginTop: '8px' }}>
                      <ProgressBar value={t.completedLevels} max={t.totalLevels || 1} height={7} tone={done ? 'correct' : 'primary'} />
                    </div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: '5px', fontWeight: 'var(--fw-bold)' }}>
                      {t.completedLevels}/{t.totalLevels} levelov
                    </p>
                  </Link>
                  <InfoButton onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTheory(t); }} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {theory && (
        <TheorySheet
          name={theory.name}
          skName={theory.skName}
          cefr={theory.cefr}
          theory={theory.theory}
          onClose={() => setTheory(null)}
        />
      )}
    </div>
  );
}
