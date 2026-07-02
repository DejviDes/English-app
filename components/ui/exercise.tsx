'use client';

import React from 'react';

/* ---------------- PromptCard ---------------- */
export function PromptCard({ prompt = '', hint, blank = false, style }: { prompt?: string; hint?: string; blank?: boolean; style?: React.CSSProperties }) {
  function renderBlank(text: string) {
    const parts = String(text).split('___');
    return parts.map((p, i) => (
      <React.Fragment key={i}>
        {p}
        {i < parts.length - 1 && (
          <span style={{ display: 'inline-block', minWidth: '54px', margin: '0 4px', borderBottom: '3px solid var(--primary-ring)', color: 'transparent' }}>___</span>
        )}
      </React.Fragment>
    ));
  }
  return (
    <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-soft)', outline: '1px solid var(--border-subtle)', outlineOffset: '-1px', padding: 'var(--pad-card-lg)', textAlign: 'center', ...style }}>
      <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--fw-bold)', color: 'var(--text-strong)', lineHeight: 'var(--leading-snug)', textWrap: 'balance' } as React.CSSProperties}>
        {blank || String(prompt).includes('___') ? renderBlank(prompt) : prompt}
      </p>
      {hint && <p style={{ marginTop: '10px', fontSize: 'var(--text-sm)', color: 'var(--text-faint)' }}>({hint})</p>}
    </div>
  );
}

/* ---------------- ChoiceOption ---------------- */
type ChoiceState = 'default' | 'selected' | 'correct' | 'wrong';

export function ChoiceOption({ children, state = 'default', onClick, disabled = false, style }: { children: React.ReactNode; state?: ChoiceState; onClick?: () => void; disabled?: boolean; style?: React.CSSProperties }) {
  const [hover, setHover] = React.useState(false);
  const states: Record<ChoiceState, { bg: string; fg: string; ring: string; mark: 'check' | 'x' | null }> = {
    default: { bg: 'var(--surface-card)', fg: 'var(--text-body)', ring: 'var(--border-default)', mark: null },
    selected: { bg: 'var(--primary-soft)', fg: 'var(--primary-soft-fg)', ring: 'var(--primary)', mark: null },
    correct: { bg: 'var(--correct-bg)', fg: 'var(--correct-fg)', ring: 'var(--correct-solid)', mark: 'check' },
    wrong: { bg: 'var(--wrong-bg)', fg: 'var(--wrong-fg)', ring: 'var(--wrong-solid)', mark: 'x' },
  };
  const s = states[state];
  const isDisabled = disabled || state === 'correct' || state === 'wrong';
  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', width: '100%', textAlign: 'left', cursor: isDisabled ? 'default' : 'pointer', background: s.bg, color: s.fg, borderRadius: 'var(--radius-lg)', padding: '16px 20px', border: 'none', outline: `${state === 'default' ? '1px' : '2px'} solid ${hover && state === 'default' ? 'var(--primary-ring)' : s.ring}`, outlineOffset: '-1px', boxShadow: 'var(--shadow-sm)', fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-semibold)', transition: 'outline-color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)', transform: hover && !isDisabled ? 'translateY(-1px)' : 'none', ...style }}
    >
      <span>{children}</span>
      {s.mark && (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: '24px', height: '24px', borderRadius: 'var(--radius-pill)', background: s.ring, color: '#fff' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
            {s.mark === 'check' ? <path d="M20 6 9 17l-5-5" /> : <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>}
          </svg>
        </span>
      )}
    </button>
  );
}

/* ---------------- MatchingRow ---------------- */
type MatchState = 'default' | 'correct' | 'wrong';

export function MatchingRow({ left, value = '', options = [], onChange, state = 'default', disabled = false, style }: { left: string; value?: string; options?: string[]; onChange?: React.ChangeEventHandler<HTMLSelectElement>; state?: MatchState; disabled?: boolean; style?: React.CSSProperties }) {
  const [focused, setFocused] = React.useState(false);
  const states: Record<MatchState, string> = { default: 'var(--border-default)', correct: 'var(--correct-solid)', wrong: 'var(--wrong-solid)' };
  const ring = focused ? 'var(--focus-ring)' : states[state];
  const leftTone = state === 'correct' ? 'var(--correct-bg)' : state === 'wrong' ? 'var(--wrong-bg)' : 'var(--surface-card)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', ...style }}>
      <span style={{ flex: 1, minWidth: 0, background: leftTone, borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', outline: `1px solid ${state !== 'default' ? states[state] : 'var(--border-subtle)'}`, outlineOffset: '-1px', padding: '13px 16px', fontSize: 'var(--text-base)', fontWeight: 'var(--fw-bold)', color: 'var(--text-strong)' }}>{left}</span>
      <span aria-hidden="true" style={{ color: 'var(--text-faint)', flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
      </span>
      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <select
          value={value}
          disabled={disabled || state !== 'default'}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ width: '100%', appearance: 'none', WebkitAppearance: 'none', background: 'var(--surface-card)', borderRadius: 'var(--radius-md)', padding: '13px 38px 13px 16px', border: 'none', outline: `1px solid ${ring}`, outlineOffset: '-1px', boxShadow: focused ? 'var(--shadow-sm), var(--ring-focus)' : 'var(--shadow-sm)', fontSize: 'var(--text-base)', fontWeight: 'var(--fw-medium)', color: value ? 'var(--text-strong)' : 'var(--text-faint)', cursor: 'pointer' }}
        >
          <option value="" disabled>choose…</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <span aria-hidden="true" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-faint)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </span>
      </div>
    </div>
  );
}
