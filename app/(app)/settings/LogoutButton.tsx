'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/primitives';

export default function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await fetch('/api/gate', { method: 'DELETE' });
      router.replace('/gate');
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="secondary" size="lg" block onClick={logout} disabled={pending}>
      {pending ? 'Logging out…' : 'Log out'}
    </Button>
  );
}
