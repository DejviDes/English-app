import { NextResponse, type NextRequest } from 'next/server';

// Paths reachable without the gate cookie (the gate itself + public PWA assets).
const OPEN = new Set(['/gate', '/api/gate', '/manifest.webmanifest', '/sw.js', '/~offline']);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (OPEN.has(pathname) || pathname.startsWith('/icon') || pathname.startsWith('/apple')) {
    return NextResponse.next();
  }

  if (req.cookies.get('gate')?.value !== process.env.APP_SECRET) {
    const url = req.nextUrl.clone();
    url.pathname = '/gate';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
