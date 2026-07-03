'use client';

import React from 'react';

/* ---------------- InlineMessage ---------------- */
type MsgTone = 'success' | 'error' | 'warning' | 'info';

export function InlineMessage({ tone = 'info', title, children, icon, style }: { tone?: MsgTone; title?: React.ReactNode; children?: React.ReactNode; icon?: React.ReactNode; style?: React.CSSProperties }) {
  const tones: Record<MsgTone, { bg: string; fg: string; ring: string }> = {
    success: { bg: 'var(--correct-bg)', fg: 'var(--correct-fg)', ring: 'var(--correct-ring)' },
    error: { bg: 'var(--wrong-bg)', fg: 'var(--wrong-fg)', ring: 'var(--wrong-ring)' },
    warning: { bg: 'var(--almost-bg)', fg: 'var(--almost-fg)', ring: 'var(--almost-ring)' },
    info: { bg: 'var(--surface-inset)', fg: 'var(--text-body)', ring: 'var(--border-default)' },
  };
  const t = tones[tone];
  return (
    <div style={{ display: 'flex', gap: '12px', background: t.bg, color: t.fg, borderRadius: 'var(--radius-lg)', boxShadow: `inset 0 0 0 1px ${t.ring}`, padding: 'var(--pad-card)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-snug)', ...style }}>
      {icon && <span style={{ flexShrink: 0, display: 'flex' }}>{icon}</span>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
        {title && <p style={{ fontWeight: 'var(--fw-bold)', fontSize: 'var(--text-base)' }}>{title}</p>}
        {children && <div style={{ opacity: 0.9 }}>{children}</div>}
      </div>
    </div>
  );
}

/* ---------------- ProgressBar ---------------- */
type BarTone = 'primary' | 'correct' | 'almost' | 'wrong';

export function ProgressBar({ value = 0, max = 100, tone = 'primary', height = 10, showLabel = false, style }: { value?: number; max?: number; tone?: BarTone; height?: number; showLabel?: boolean; style?: React.CSSProperties }) {
  const pct = Math.max(0, Math.min(100, max === 0 ? 0 : (value / max) * 100));
  const fills: Record<BarTone, string> = {
    primary: 'var(--primary)', correct: 'var(--correct-solid)', almost: 'var(--almost-solid)', wrong: 'var(--wrong-solid)',
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', ...style }}>
      <div style={{ flex: 1, height: `${height}px`, borderRadius: 'var(--radius-pill)', background: 'var(--surface-inset)', overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.06)' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 'var(--radius-pill)', background: fills[tone], transition: 'width var(--dur-slow) var(--ease-out)' }} />
      </div>
      {showLabel && <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-bold)', color: 'var(--text-muted)', minWidth: '44px', textAlign: 'right' }}>{value} / {max}</span>}
    </div>
  );
}

/* ---------------- VerdictBanner ---------------- */
type Verdict = 'correct' | 'almost' | 'wrong';

export function VerdictBanner({
  verdict = 'correct',
  answer,
  explanation,
  nextReview,
  en,
  sk,
  style,
}: {
  verdict?: Verdict;
  answer?: React.ReactNode;
  explanation?: React.ReactNode;
  nextReview?: React.ReactNode;
  en?: string;
  sk?: string;
  style?: React.CSSProperties;
}) {
  const config: Record<Verdict, { bg: string; fg: string; ring: string; solid: string; label: string; emoji: string; icon: React.ReactNode }> = {
    correct: { bg: 'var(--correct-bg)', fg: 'var(--correct-fg)', ring: 'var(--correct-ring)', solid: 'var(--correct-solid)', label: 'Correct', emoji: '🎉', icon: <path d="M20 6 9 17l-5-5" /> },
    almost: { bg: 'var(--almost-bg)', fg: 'var(--almost-fg)', ring: 'var(--almost-ring)', solid: 'var(--almost-solid)', label: 'Almost', emoji: '✨', icon: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4" /><path d="M12 16h.01" /></> },
    wrong: { bg: 'var(--wrong-bg)', fg: 'var(--wrong-fg)', ring: 'var(--wrong-ring)', solid: 'var(--wrong-solid)', label: 'Not quite', emoji: '', icon: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></> },
  };
  const c = config[verdict];
  return (
    <div className="lingua-animate-pop" style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: c.bg, color: c.fg, borderRadius: 'var(--radius-xl)', boxShadow: `inset 0 0 0 1px ${c.ring}`, padding: 'var(--pad-card)', textAlign: 'center', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: 'var(--radius-pill)', background: c.solid, color: '#fff', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">{c.icon}</svg>
        </span>
        <span style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--fw-extrabold)' }}>{c.label}{c.emoji ? ` ${c.emoji}` : ''}</span>
      </div>
      {en || sk ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {en && (
            <p style={{ fontSize: 'var(--text-base)' }}>
              🇬🇧 <span style={{ fontWeight: 'var(--fw-bold)' }}>{en}</span>
            </p>
          )}
          {sk && (
            <p style={{ fontSize: 'var(--text-base)' }}>
              🇸🇰 <span style={{ fontWeight: 'var(--fw-bold)' }}>{sk}</span>
            </p>
          )}
        </div>
      ) : (
        answer != null && (
          <p style={{ fontSize: 'var(--text-base)' }}>
            Answer: <span style={{ fontWeight: 'var(--fw-bold)' }}>{answer}</span>
          </p>
        )
      )}
      {explanation && <p style={{ fontSize: 'var(--text-sm)', opacity: 0.85, lineHeight: 'var(--leading-snug)' }}>{explanation}</p>}
      {nextReview && <p style={{ fontSize: 'var(--text-xs)', opacity: 0.7 }}>next review: {nextReview}</p>}
    </div>
  );
}
