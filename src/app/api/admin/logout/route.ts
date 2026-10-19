import { NextResponse } from 'next/server';
import { guardAdmin } from '@/lib/auth';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/session';
import { bumpSessionEpoch } from '@/lib/store';

export async function POST(request: Request) {
  const { everywhere } = (await request.json().catch(() => ({}))) as { everywhere?: boolean };
  if (everywhere) {
    const denied = await guardAdmin({ mutating: true });
    if (denied) return denied;
    await bumpSessionEpoch();
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0));
  return response;
}
