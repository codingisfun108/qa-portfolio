import { NextResponse } from 'next/server';
import { clientIp, isSameOrigin } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { rateLimit } from '@/lib/ratelimit';
import { messageSchema } from '@/lib/schema';
import { addMessage, getContent } from '@/lib/store';

// Optional email alert for new messages through Resend (free tier). Set RESEND_API_KEY and
// NOTIFY_EMAIL in Vercel to turn it on; messages are saved to the admin inbox either way.
async function notify(m: { name: string; email: string; company: string; message: string }) {
  const to = process.env.NOTIFY_EMAIL;
  if (!process.env.RESEND_API_KEY || !to) return;
  try {
    await sendEmail({
      to,
      replyTo: m.email,
      subject: `Portfolio message from ${m.name}`,
      text: `${m.name} <${m.email}>${m.company ? ` (${m.company})` : ''}\n\n${m.message}`,
    });
  } catch (err) {
    console.error('Email alert failed', err);
  }
}

export async function POST(request: Request) {
  if (!(await isSameOrigin())) return NextResponse.json({ error: 'Request blocked.' }, { status: 403 });

  const content = await getContent();
  if (!content.contact.formEnabled) {
    return NextResponse.json({ error: 'The contact form is turned off. Use the email address instead.' }, { status: 403 });
  }

  const parsed = messageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    // A filled honeypot means a bot; reply as if it worked and store nothing.
    if (first?.path[0] === 'website') return NextResponse.json({ ok: true });
    return NextResponse.json({ error: first?.message ?? 'Check the form and try again.', field: first?.path[0] }, { status: 400 });
  }

  const limit = await rateLimit('contact', await clientIp());
  if (!limit.ok) {
    return NextResponse.json({ error: 'You have sent several messages already. Email me directly instead.' }, { status: 429 });
  }

  const { website: _honeypot, ...message } = parsed.data;
  try {
    await addMessage(message);
  } catch (err) {
    console.error('Could not store message', err);
    return NextResponse.json({ error: 'Your message could not be sent. Email me directly instead.' }, { status: 503 });
  }
  await notify(message);
  return NextResponse.json({ ok: true });
}
