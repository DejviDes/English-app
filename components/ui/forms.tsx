'use client';

import React from 'react';

/* ---------------- Input ---------------- */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export function Input({ label, hint, error, id, iconLeft = null, iconRight = null, style, onFocus, onBlur, ...rest }: InputProps) {
  const [focused, setFocused] = React.useState(false);
  const auto = React.useId();
  const inputId = id || auto;
  const ringColor = error ? 'var(--wrong-solid)' : focused ? 'var(--focus-ring)' : 'var(--border-default)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && <label htmlFor={inputId} style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-body)' }}>{label}</label>}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--surface-card)', borderRadius: 'var(--radius-md)', padding: '13px 16px', boxShadow: focused ? `var(--shadow-sm), 0 0 0 ${error ? '2px' : '3px'} ${error ? 'rgba(244,63,94,0.28)' : 'rgba(62,200,125,0.30)'}` : 'var(--shadow-sm)', outline: `1px solid ${ringColor}`, outlineOffset: '-1px', transition: 'box-shadow var(--dur-fast) var(--ease-out), outline-color var(--dur-fast) var(--ease-out)' }}>
        {iconLeft && <span style={{ color: 'var(--text-faint)', display: 'flex' }}>{iconLeft}</span>}
        <input
          id={inputId}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 'var(--text-base)', color: 'var(--text-strong)', fontWeight: 'var(--fw-medium)', ...style }}
          {...rest}
        />
        {iconRight && <span style={{ color: 'var(--text-faint)', display: 'flex' }}>{iconRight}</span>}
      </div>
      {(hint || error) && <span style={{ fontSize: 'var(--text-xs)', color: error ? 'var(--wrong-fg)' : 'var(--text-faint)' }}>{error || hint}</span>}
    </div>
  );
}

/* ---------------- Select ---------------- */
type Option = string | { value: string; label: string };
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options?: Option[];
  placeholder?: string;
}

export function Select({ label, hint, error, id, options = [], placeholder, style, children, onFocus, onBlur, ...rest }: SelectProps) {
  const [focused, setFocused] = React.useState(false);
  const auto = React.useId();
  const selId = id || auto;
  const ringColor = error ? 'var(--wrong-solid)' : focused ? 'var(--focus-ring)' : 'var(--border-default)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && <label htmlFor={selId} style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-body)' }}>{label}</label>}
      <div style={{ position: 'relative', width: '100%' }}>
        <select
          id={selId}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          style={{ width: '100%', appearance: 'none', WebkitAppearance: 'none', background: 'var(--surface-card)', borderRadius: 'var(--radius-md)', padding: '13px 40px 13px 16px', border: 'none', outline: `1px solid ${ringColor}`, outlineOffset: '-1px', boxShadow: focused ? 'var(--shadow-sm), var(--ring-focus)' : 'var(--shadow-sm)', fontSize: 'var(--text-base)', fontWeight: 'var(--fw-medium)', color: 'var(--text-strong)', cursor: 'pointer', transition: 'box-shadow var(--dur-fast) var(--ease-out), outline-color var(--dur-fast) var(--ease-out)', ...style }}
          {...rest}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((o) => {
            const val = typeof o === 'string' ? o : o.value;
            const lbl = typeof o === 'string' ? o : o.label;
            return <option key={val} value={val}>{lbl}</option>;
          })}
          {children}
        </select>
        <span aria-hidden="true" style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-faint)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </span>
      </div>
      {(hint || error) && <span style={{ fontSize: 'var(--text-xs)', color: error ? 'var(--wrong-fg)' : 'var(--text-faint)' }}>{error || hint}</span>}
    </div>
  );
}

/* ---------------- Textarea ---------------- */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  mono?: boolean;
}

export function Textarea({ label, hint, error, id, mono = false, rows = 6, style, onFocus, onBlur, ...rest }: TextareaProps) {
  const [focused, setFocused] = React.useState(false);
  const auto = React.useId();
  const areaId = id || auto;
  const ringColor = error ? 'var(--wrong-solid)' : focused ? 'var(--focus-ring)' : 'var(--border-default)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && <label htmlFor={areaId} style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-body)' }}>{label}</label>}
      <textarea
        id={areaId}
        rows={rows}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        style={{ width: '100%', resize: 'vertical', background: 'var(--surface-card)', borderRadius: 'var(--radius-md)', padding: '14px 16px', border: 'none', outline: `1px solid ${ringColor}`, outlineOffset: '-1px', boxShadow: focused ? `var(--shadow-sm), 0 0 0 ${error ? '2px' : '3px'} ${error ? 'rgba(244,63,94,0.28)' : 'rgba(62,200,125,0.30)'}` : 'var(--shadow-sm)', fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)', fontSize: mono ? 'var(--text-xs)' : 'var(--text-base)', lineHeight: 'var(--leading-normal)', color: 'var(--text-strong)', transition: 'box-shadow var(--dur-fast) var(--ease-out), outline-color var(--dur-fast) var(--ease-out)', ...style }}
        {...rest}
      />
      {(hint || error) && <span style={{ fontSize: 'var(--text-xs)', color: error ? 'var(--wrong-fg)' : 'var(--text-faint)' }}>{error || hint}</span>}
    </div>
  );
}

/* ---------------- Checkbox ---------------- */
export function Checkbox({ label, checked, onChange, disabled = false, id }: { label?: string; checked?: boolean; onChange?: React.ChangeEventHandler<HTMLInputElement>; disabled?: boolean; id?: string }) {
  const auto = React.useId();
  const boxId = id || auto;
  return (
    <label htmlFor={boxId} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-medium)', color: 'var(--text-body)' }}>
      <span style={{ position: 'relative', flexShrink: 0, width: '22px', height: '22px', borderRadius: 'var(--radius-xs)', background: checked ? 'var(--primary)' : 'var(--surface-card)', outline: `1px solid ${checked ? 'var(--primary)' : 'var(--border-strong)'}`, outlineOffset: '-1px', boxShadow: 'var(--shadow-xs)', transition: 'background var(--dur-fast) var(--ease-out), outline-color var(--dur-fast) var(--ease-out)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: checked ? 1 : 0, transform: checked ? 'scale(1)' : 'scale(0.6)', transition: 'all var(--dur-fast) var(--ease-spring)' }}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      <input id={boxId} type="checkbox" checked={checked} disabled={disabled} onChange={onChange} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
      {label && <span>{label}</span>}
    </label>
  );
}

/* ---------------- FileDropzone ---------------- */
export function FileDropzone({ title = 'Choose a JSON file', hint = 'exercises · words · grammar_topics', accept = 'application/json,.json', icon = null, onFile }: { title?: string; hint?: string; accept?: string; icon?: React.ReactNode; onFile?: (f: File) => void }) {
  const [over, setOver] = React.useState(false);
  function handleFiles(files: FileList | null) {
    const f = files && files[0];
    if (f && onFile) onFile(f);
  }
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); handleFiles(e.dataTransfer.files); }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer', textAlign: 'center', borderRadius: 'var(--radius-xl)', border: `2px dashed ${over ? 'var(--primary)' : 'var(--border-default)'}`, background: over ? 'var(--primary-soft)' : 'var(--surface-card)', padding: '36px 24px', color: 'var(--text-muted)', transition: 'border-color var(--dur-base) var(--ease-out), background var(--dur-base) var(--ease-out)' }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '52px', height: '52px', borderRadius: 'var(--radius-lg)', background: 'var(--primary-soft)', color: 'var(--primary)' }}>
        {icon || (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
        )}
      </span>
      <span style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--fw-bold)', color: 'var(--text-body)' }}>{title}</span>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>{hint}</span>
      <input type="file" accept={accept} style={{ display: 'none' }} onChange={(e) => handleFiles(e.target.files)} />
    </label>
  );
}
