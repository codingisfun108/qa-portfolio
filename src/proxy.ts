import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from './lib/session';

// First gate for the admin area: no valid session, no admin pages or admin APIs.
// Route handlers check the session again (see lib/auth.ts) before reading or writing anything.

const PUBLIC_ADMIN_PATHS = new Set(['/admin/login', '/api/admin/login']);

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_ADMIN_PATHS.has(pathname)) return NextResponse.next();

  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Your session has ended. Sign in again.' }, { status: 401 });
  }
  const login = new URL('/admin/login', request.url);
  login.searchParams.set('next', pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
