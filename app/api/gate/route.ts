import { cookies } from 'next/headers';

const YEAR = 60 * 60 * 24 * 365;

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.APP_SECRET;
  const body = (await req.json().catch(() => ({}))) as { secret?: string };
  if (!secret || body.secret !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }
  const store = await cookies();
  store.set('gate', secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: YEAR,
  });
  return new Response(null, { status: 204 });
}

export async function DELETE(): Promise<Response> {
  const store = await cookies();
  store.delete('gate');
  return new Response(null, { status: 204 });
}
