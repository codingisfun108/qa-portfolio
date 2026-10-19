import 'server-only';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from './session';
import { getSessionEpoch } from './store';

/** Full session check for server code. proxy.ts is only the first gate. */
export async function getAdminSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);
  if (!session) return null;
  const epoch = await getSessionEpoch();
  if (epoch && session.iat < epoch) return null;
  return session;
}

/** Blocks cross-site form posts: the Origin header must match this site. */
export async function isSameOrigin() {
  const h = await headers();
  const origin = h.get('origin');
  if (!origin) return true; // Same-origin fetches from older browsers may omit it.
  const host = h.get('x-forwarded-host') ?? h.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Use at the top of every admin route handler. Returns a response when access is denied. */
export async function guardAdmin(options: { mutating?: boolean } = {}) {
  if (options.mutating && !(await isSameOrigin())) {
    return NextResponse.json({ error: 'Request blocked: it did not come from this site.' }, { status: 403 });
  }
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Your session has ended. Sign in again.' }, { status: 401 });
  return null;
}

export async function clientIp() {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'local';
}
