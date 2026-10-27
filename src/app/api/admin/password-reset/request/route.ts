import { NextResponse } from 'next/server';
import { z } from 'zod';
import { clientIp, isSameOrigin } from '@/lib/auth';
import { canSendEmail } from '@/lib/email';
import { requestPasswordReset } from '@/lib/password-reset';
import { rateLimit } from '@/lib/ratelimit';
import { getAdminConfig } from '@/lib/session';
import { storageMode } from '@/lib/store';

const body = z.object({ email: z.string().trim().max(200) });

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
  if (storageMode() === 'readonly' || !canSendEmail()) {
    return NextResponse.json(
      { error: 'Password reset needs storage and email. In Vercel, connect Upstash for Redis and add RESEND_API_KEY, then redeploy.' },
      { status: 503 },
    );
  }

  const limit = await rateLimit('resetRequest', await clientIp());
  if (!limit.ok) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfter / 60));
    return NextResponse.json(
      { error: `Too many reset requests. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !parsed.data.email) {
    return NextResponse.json({ error: 'Enter your email address.' }, { status: 400 });
  }

  try {
    await requestPasswordReset(config, parsed.data.email.toLowerCase());
  } catch (err) {
    console.error('Password reset email failed', err);
    return NextResponse.json({ error: 'The reset email could not be sent. Try again later.' }, { status: 502 });
  }
  // Same reply whether or not the email matched, so this form can't be used to guess it.
  return NextResponse.json({ ok: true });
}
