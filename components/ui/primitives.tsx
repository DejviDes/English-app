'use client';

import React from 'react';

/* ---------------- Button ---------------- */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg' | 'hero';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  block = false,
  loading = false,
  disabled = false,
  iconLeft = null,
  iconRight = null,
  type = 'button',
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const sizes: Record<ButtonSize, React.CSSProperties & { gap: string }> = {
    sm: { padding: '8px 14px', fontSize: 'var(--text-sm)', borderRadius: 'var(--radius-sm)', gap: '6px' },
    md: { padding: '12px 20px', fontSize: 'var(--text-base)', borderRadius: 'var(--radius-md)', gap: '8px' },
    lg: { padding: '16px 22px', fontSize: 'var(--text-lg)', borderRadius: 'var(--radius-lg)', gap: '10px' },
    hero: { padding: '20px 26px', fontSize: 'var(--text-xl)', borderRadius: 'var(--radius-xl)', gap: '10px' },
  };
  const s = sizes[size];

  const variants: Record<ButtonVariant, React.CSSProperties> = {
    primary: { background: 'var(--primary)', color: 'var(--text-on-primary)', boxShadow: 'var(--shadow-primary)', border: '1px solid transparent' },
    secondary: { background: 'var(--surface-card)', color: 'var(--text-strong)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-default)' },
    ghost: { background: 'transparent', color: 'var(--primary-soft-fg)', boxShadow: 'none', border: '1px solid transparent' },
    link: { background: 'transparent', color: 'var(--primary)', boxShadow: 'none', border: '1px solid transparent', textDecoration: 'underline', textUnderlineOffset: '3px' },
  };
  const v = variants[variant];
  const hoverBg: Record<ButtonVariant, string> = {
    primary: 'var(--primary-hover)', secondary: 'var(--surface-sunken)', ghost: 'var(--primary-soft)', link: 'transparent',
  };

  return (
    <button
      type={type}
      disabled={isDisabled}
      style={{
        display: block ? 'flex' : 'inline-flex',
        width: block ? '100%' : 'auto',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        fontFamily: 'var(--font-sans)',
        fontWeight: 'var(--fw-bold)',
        fontSize: s.fontSize,
        lineHeight: 1.1,
        padding: variant === 'link' ? 0 : s.padding,
        borderRadius: variant === 'link' ? 0 : s.borderRadius,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.45 : 1,
        transition: 'transform var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        ...v,
        ...style,
      }}
      onMouseEnter={(e) => { if (!isDisabled && variant !== 'link') e.currentTarget.style.background = hoverBg[variant]; }}
      onMouseLeave={(e) => { if (!isDisabled) e.currentTarget.style.background = String(v.background); }}
      onMouseDown={(e) => { if (!isDisabled && variant !== 'link') e.currentTarget.style.transform = 'scale(var(--press-scale))'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          style={{ width: '1em', height: '1em', borderRadius: '50%', border: '2px solid currentColor', borderTopColor: 'transparent', display: 'inline-block', animation: 'lingua-spin 0.7s linear infinite' }}
        />
      )}
      {!loading && iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  );
}

/* ---------------- Card ---------------- */
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

export function Card({ children, padding = 'md', interactive = false, style, ...rest }: CardProps) {
  const pads = { none: '0', sm: '16px', md: 'var(--pad-card)', lg: 'var(--pad-card-lg)' };
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => interactive && setHover(true)}
      onMouseLeave={() => interactive && setHover(false)}
      style={{
        background: 'var(--surface-card)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-soft)',
        outline: '1px solid var(--border-subtle)',
        outlineOffset: '-1px',
        padding: pads[padding],
        transition: 'box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out)',
        transform: hover ? 'translateY(-2px)' : 'none',
        cursor: interactive ? 'pointer' : 'default',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ---------------- Stat ---------------- */
export function Stat({ value, label, tone = 'default', style }: { value: React.ReactNode; label: string; tone?: 'default' | 'primary'; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: 'var(--surface-card)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        outline: '1px solid var(--border-subtle)',
        outlineOffset: '-1px',
        padding: '18px 12px',
        textAlign: 'center',
        ...style,
      }}
    >
      <p style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--fw-extrabold)', color: tone === 'primary' ? 'var(--primary)' : 'var(--text-strong)', lineHeight: 1 }}>{value}</p>
      <p style={{ marginTop: '6px', fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-bold)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', color: 'var(--text-faint)' }}>{label}</p>
    </div>
  );
}

/* ---------------- StartCard ---------------- */
export function StartCard({ title = 'Start session', due = 0, newItems = 0, subtitle, disabled = false, onClick }: { title?: string; due?: number; newItems?: number; subtitle?: string; disabled?: boolean; onClick?: () => void }) {
  const [pressed, setPressed] = React.useState(false);
  const sub = subtitle ?? `${due} due · ${newItems} new`;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px',
        width: '100%', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        borderRadius: 'var(--radius-2xl)', padding: '34px 24px',
        background: disabled ? 'var(--slate-300)' : 'linear-gradient(160deg, var(--green-500) 0%, var(--green-600) 60%, var(--green-700) 100%)',
        color: '#fff',
        boxShadow: disabled ? 'var(--shadow-sm)' : 'var(--shadow-primary)',
        transform: pressed && !disabled ? 'scale(0.985)' : 'scale(1)',
        transition: 'transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)',
        opacity: disabled ? 0.7 : 1, position: 'relative', overflow: 'hidden',
      }}
    >
      <span aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 50% -20%, rgba(255,255,255,0.28), transparent 60%)', pointerEvents: 'none' }} />
      <span style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: 'var(--text-2xl)', fontWeight: 'var(--fw-extrabold)', letterSpacing: 'var(--tracking-tight)' }}>
        {title}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
      </span>
      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-semibold)', color: 'rgba(255,255,255,0.85)' }}>{sub}</span>
    </button>
  );
}

/* ---------------- Badge ---------------- */
type BadgeTone = 'neutral' | 'primary' | 'correct' | 'almost' | 'wrong' | 'streak';

export function Badge({ children, tone = 'neutral', size = 'md', icon = null, style }: { children: React.ReactNode; tone?: BadgeTone; size?: 'sm' | 'md'; icon?: React.ReactNode; style?: React.CSSProperties }) {
  const tones: Record<BadgeTone, { bg: string; fg: string; ring: string }> = {
    neutral: { bg: 'var(--surface-inset)', fg: 'var(--text-muted)', ring: 'transparent' },
    primary: { bg: 'var(--primary-soft)', fg: 'var(--primary-soft-fg)', ring: 'var(--primary-ring)' },
    correct: { bg: 'var(--correct-bg)', fg: 'var(--correct-fg)', ring: 'var(--correct-ring)' },
    almost: { bg: 'var(--almost-bg)', fg: 'var(--almost-fg)', ring: 'var(--almost-ring)' },
    wrong: { bg: 'var(--wrong-bg)', fg: 'var(--wrong-fg)', ring: 'var(--wrong-ring)' },
    streak: { bg: '#fff7ed', fg: '#c2560f', ring: '#fed7aa' },
  };
  const t = tones[tone];
  const pad = size === 'sm' ? '3px 9px' : '5px 12px';
  const fs = size === 'sm' ? 'var(--text-xs)' : 'var(--text-sm)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', borderRadius: 'var(--radius-pill)', background: t.bg, color: t.fg, boxShadow: `inset 0 0 0 1px ${t.ring}`, padding: pad, fontSize: fs, fontWeight: 'var(--fw-bold)', lineHeight: 1, whiteSpace: 'nowrap', ...style }}>
      {icon}
      {children}
    </span>
  );
}

/* ---------------- AppHeader ---------------- */
export function AppHeader({ title, subtitle, right, onBack, style }: { title: React.ReactNode; subtitle?: string; right?: React.ReactNode; onBack?: () => void; style?: React.CSSProperties }) {
  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        {onBack && (
          <button type="button" onClick={onBack} aria-label="Back" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', flexShrink: 0, borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', background: 'var(--surface-card)', color: 'var(--text-body)', boxShadow: 'var(--shadow-sm)', outline: '1px solid var(--border-subtle)', outlineOffset: '-1px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--fw-extrabold)', color: 'var(--text-strong)' }}>{title}</h1>
          {subtitle && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '2px' }}>{subtitle}</p>}
        </div>
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </header>
  );
}
