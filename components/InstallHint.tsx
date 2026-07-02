'use client';

import { useEffect, useState } from 'react';

// iOS Safari has no beforeinstallprompt, so we show a manual hint — only on iOS,
// only when not already running as an installed (standalone) app.
export default function InstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS && !isStandalone && !localStorage.getItem('install-hint-dismissed')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: 'var(--primary-soft)', color: 'var(--primary-soft-fg)', borderRadius: 'var(--radius-lg)', boxShadow: 'inset 0 0 0 1px var(--primary-ring)', padding: '16px', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-snug)' }}>
      <span style={{ fontSize: '18px' }}>📲</span>
      <p style={{ flex: 1 }}>
        Install this app: tap <strong>Share</strong> then <strong>Add to Home Screen</strong>.
      </p>
      <button
        onClick={() => { localStorage.setItem('install-hint-dismissed', '1'); setShow(false); }}
        aria-label="Dismiss"
        style={{ border: 'none', background: 'transparent', color: 'var(--primary-soft-fg)', fontWeight: 'var(--fw-bold)', cursor: 'pointer', fontSize: '16px' }}
      >
        ✕
      </button>
    </div>
  );
}
