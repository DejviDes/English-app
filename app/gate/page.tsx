'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@/components/ui/primitives';
import { Input } from '@/components/ui/forms';

export default function GatePage() {
  const router = useRouter();
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    try {
      const res = await fetch('/api/gate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ secret }),
      });
      if (res.ok) {
        router.replace('/');
        router.refresh();
      } else {
        setError('Wrong secret.');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <main style={{ minHeight: '100dvh', background: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="lingua-app-column">
        <Card padding="lg">
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', margin: '0 auto 12px', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(160deg,var(--green-500),var(--green-700))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: 'var(--fw-black)', boxShadow: 'var(--shadow-primary)' }}>
                E
              </div>
              <h1 style={{ fontSize: 'var(--text-2xl)' }}>English</h1>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>Your daily drill</p>
            </div>
            <Input type="password" placeholder="Enter secret" value={secret} onChange={(e) => { setSecret(e.target.value); setError(''); }} error={error || undefined} autoFocus />
            <Button variant="primary" size="lg" block type="submit" disabled={pending || !secret}>
              {pending ? 'Unlocking…' : 'Unlock'}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
