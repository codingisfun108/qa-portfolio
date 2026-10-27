import { NextResponse } from 'next/server';
import { z } from 'zod';
import { clientIp, isSameOrigin } from '@/lib/auth';
import { verifyPassword } from '@/lib/password';
import { activePasswordHash } from '@/lib/password-reset';
import { rateLimit } from '@/lib/ratelimit';
import { SESSION_COOKIE, createSessionToken, getAdminConfig, sessionCookieOptions } from '@/lib/session';

const body = z.object({ email: z.string().trim().max(200), password: z.string().max(200) });

export async function POST(request: Request) {
  if (!(await isSameOrigin())) {
    return NextResponse.json({ error: 'Request blocked: it did not come from this site.' }, { status: 403 });
  }
  const config = getAdminConfig();
  if (!config) {
    return NextResponse.json(
      { error: 'Admin login is not set up. Add ADMIN_EMAIL, ADMIN_PASSWORD_HASH and SESSION_SECRET in Vercel, then redeploy.' },
      { status: 503 },
    );
  }

  const ip = await clientIp();
  const limit = await rateLimit('login', ip);
  if (!limit.ok) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfter / 60));
    return NextResponse.json(
      { error: `Too many sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  const parsed = body.safeParse(await request.json().catch(() => null));
  const email = parsed.success ? parsed.data.email.toLowerCase() : '';
  const password = parsed.success ? parsed.data.password : '';

  // Always run the hash so a wrong email and a wrong password take the same time.
  const passwordOk = await verifyPassword(password, await activePasswordHash(config));
  if (!passwordOk || email !== config.email) {
    return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await createSessionToken(config), sessionCookieOptions());
  return response;
}
