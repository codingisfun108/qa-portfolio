import { NextResponse } from 'next/server';
import { z } from 'zod';
import { clientIp, isSameOrigin } from '@/lib/auth';
import { MIN_PASSWORD_LENGTH, completePasswordReset } from '@/lib/password-reset';
import { rateLimit } from '@/lib/ratelimit';
import { SESSION_COOKIE, getAdminConfig } from '@/lib/session';

const body = z.object({
  email: z.string().trim().max(200),
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code from the email.'),
  password: z.string().min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters. A short sentence works well.`).max(200),
});

export async function POST(request: Request) {
  if (!(await isSameOrigin())) {
    return NextResponse.json({ error: 'Request blocked: it did not come from this site.' }, { status: 403 });
  }
  const config = getAdminConfig();
  if (!config) return NextResponse.json({ error: 'Admin login is not set up.' }, { status: 503 });

  const limit = await rateLimit('resetVerify', await clientIp());
  if (!limit.ok) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfter / 60));
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? 'Check the form and try again.', field: first?.path[0] }, { status: 400 });
  }

  const { email, code, password } = parsed.data;
  let result;
  try {
    result = await completePasswordReset(config, email.toLowerCase(), code, password);
  } catch (err) {
    console.error('Password reset failed', err);
    return NextResponse.json({ error: 'The password could not be saved. Try again later.' }, { status: 503 });
  }
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  // Every session ended with the reset; clear this browser's cookie too.
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
