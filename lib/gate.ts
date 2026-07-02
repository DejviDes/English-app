import 'server-only';
import { cookies } from 'next/headers';

// Single shared-secret gate. The cookie value equals APP_SECRET; middleware
// enforces it for navigation, and server actions call assertGate() as a second
// line of defense (so they aren't callable even if middleware is bypassed).

export async function isGateOpen(): Promise<boolean> {
  const secret = process.env.APP_SECRET;
  if (!secret) return false;
  const store = await cookies();
  return store.get('gate')?.value === secret;
}

export async function assertGate(): Promise<void> {
  if (!(await isGateOpen())) throw new Error('unauthorized');
}
