'use client';

import React from 'react';

/** Plays a word/sentence out loud via the browser's built-in speech synthesis.
 *  Free, on-device (no network, no paid AI). Hides itself where unsupported. */
export function SpeakButton({
  text,
  lang = 'en-GB',
  size = 34,
  tone = 'soft',
  style,
}: {
  text: string;
  lang?: string;
  size?: number;
  tone?: 'soft' | 'ghost';
  style?: React.CSSProperties;
}) {
  const [supported, setSupported] = React.useState(true);
  const [speaking, setSpeaking] = React.useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- one-time client capability check (starts true to avoid hydration mismatch) */
  React.useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function speak(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = 0.9;
      const voices = synth.getVoices();
      const v = voices.find((x) => x.lang === lang) || voices.find((x) => x.lang?.toLowerCase().startsWith('en'));
      if (v) u.voice = v;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      setSpeaking(true);
      synth.speak(u);
    } catch {
      setSpeaking(false);
    }
  }

  if (!supported) return null;

  const bg = tone === 'soft' ? 'var(--surface-inset)' : 'transparent';
  return (
    <button
      type="button"
      onClick={speak}
      aria-label="Prehrať výslovnosť"
      style={{
        flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: size, height: size, borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer',
        background: bg, color: speaking ? 'var(--primary)' : 'var(--text-muted)',
        transition: 'color var(--dur-fast) var(--ease-out)', ...style,
      }}
    >
      <svg width={Math.round(size * 0.55)} height={Math.round(size * 0.55)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6 9H2v6h4l5 4z" />
        {speaking
          ? <><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></>
          : <path d="M15.5 8.5a5 5 0 0 1 0 7" />}
      </svg>
    </button>
  );
}
