'use client';

import { useEffect } from 'react';
import { flushOutbox } from '@/lib/offline/sync';

// Mounted once in the app layout. iOS has no Background Sync, so we flush the
// outbox on the only reliable foreground signals: online, tab-visible, app-open.
export default function SyncProvider() {
  useEffect(() => {
    navigator.storage?.persist?.().catch(() => {});
    flushOutbox();

    const onOnline = () => flushOutbox();
    const onVisible = () => {
      if (!document.hidden) flushOutbox();
    };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return null;
}
