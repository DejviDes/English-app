'use client';

import { useEffect, useState } from 'react';

// iOS Safari has no beforeinstallprompt, so we show a manual hint — only on iOS,
// only when not already running as an installed (standalone) app.
export default function InstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS && !isStandalone && !localStorage.getItem('install-hint-dismissed')) {
      // Client-only detection (matchMedia/navigator/localStorage) — must run after
      // mount; a one-time post-mount setState is intended here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="mx-auto mb-4 flex max-w-md items-start gap-3 rounded-2xl bg-indigo-50 p-4 text-sm text-indigo-800 ring-1 ring-indigo-200">
      <span className="text-lg">📲</span>
      <p className="flex-1">
        Install this app: tap <strong>Share</strong> then <strong>Add to Home Screen</strong>.
      </p>
      <button
        onClick={() => {
          localStorage.setItem('install-hint-dismissed', '1');
          setShow(false);
        }}
        className="font-medium text-indigo-500"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
