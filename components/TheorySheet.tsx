'use client';

import { useEffect } from 'react';
import type { GrammarTheory } from '@/lib/repos/grammar';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <p style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-extrabold)', letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase', color: 'var(--primary)' }}>
        {title}
      </p>
      {children}
    </div>
  );
}

export default function TheorySheet({
  name,
  skName,
  cefr,
  theory,
  onClose,
}: {
  name: string;
  skName: string | null;
  cefr?: string;
  theory: GrammarTheory | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const form = theory?.form;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)',
        padding: 'calc(env(safe-area-inset-top) + 24px) 0 0',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="lingua-app-column"
        style={{
          width: '100%', maxHeight: '92dvh', overflowY: 'auto', background: 'var(--bg-app)',
          borderTopLeftRadius: 'var(--radius-2xl)', borderTopRightRadius: 'var(--radius-2xl)',
          boxShadow: 'var(--shadow-lg)', padding: '10px var(--pad-screen) calc(28px + env(safe-area-inset-bottom))',
        }}
      >
        {/* grabber + header */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 14px' }}>
          <span style={{ width: 40, height: 5, borderRadius: 'var(--radius-pill)', background: 'var(--border-strong)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--fw-extrabold)', color: 'var(--text-strong)' }}>{name}</h2>
            {skName && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '2px' }}>{skName}{cefr ? ` · ${cefr}` : ''}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', background: 'var(--surface-card)', color: 'var(--text-body)', boxShadow: 'var(--shadow-sm)', outline: '1px solid var(--border-subtle)', outlineOffset: '-1px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>

        {!theory ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Teória zatiaľ nie je k dispozícii.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {theory.intro && (
              <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-body)', lineHeight: 'var(--leading-normal)' }}>{theory.intro}</p>
            )}

            {form && (
              <Section title="Skladanie viet">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {([['➕', form.positive], ['➖', form.negative], ['❓', form.question]] as const)
                    .filter(([, v]) => v)
                    .map(([icon, v]) => (
                      <div key={icon} style={{ display: 'flex', gap: '10px', background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', outline: '1px solid var(--border-subtle)', outlineOffset: '-1px', padding: '12px 14px' }}>
                        <span aria-hidden style={{ flexShrink: 0 }}>{icon}</span>
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 'var(--leading-snug)' }}>{v}</p>
                      </div>
                    ))}
                </div>
              </Section>
            )}

            {theory.usage && theory.usage.length > 0 && (
              <Section title="Kedy sa používa">
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '7px', paddingLeft: '2px' }}>
                  {theory.usage.map((u, i) => (
                    <li key={i} style={{ display: 'flex', gap: '9px', fontSize: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 'var(--leading-snug)' }}>
                      <span style={{ color: 'var(--primary)', flexShrink: 0 }}>•</span>{u}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {theory.signalWords && theory.signalWords.length > 0 && (
              <Section title="Signálne slová">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                  {theory.signalWords.map((w) => (
                    <span key={w} style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-bold)', color: 'var(--primary-soft-fg)', background: 'var(--primary-soft)', borderRadius: 'var(--radius-pill)', padding: '5px 12px' }}>{w}</span>
                  ))}
                </div>
              </Section>
            )}

            {theory.examples && theory.examples.length > 0 && (
              <Section title="Príklady">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {theory.examples.map((ex, i) => (
                    <div key={i} style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', outline: '1px solid var(--border-subtle)', outlineOffset: '-1px', padding: '12px 14px' }}>
                      <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--fw-bold)', color: 'var(--text-strong)' }}>🇬🇧 {ex.en}</p>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '2px' }}>🇸🇰 {ex.sk}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {theory.tips && theory.tips.length > 0 && (
              <Section title="Tipy a pomôcky">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {theory.tips.map((tip, i) => (
                    <div key={i} style={{ display: 'flex', gap: '9px', background: 'var(--almost-bg)', color: 'var(--almost-fg)', borderRadius: 'var(--radius-lg)', boxShadow: 'inset 0 0 0 1px var(--almost-ring)', padding: '12px 14px', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-snug)' }}>
                      <span aria-hidden style={{ flexShrink: 0 }}>💡</span>{tip}
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
