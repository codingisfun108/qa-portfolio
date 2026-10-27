import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { storageMode } from './store';

// Sends email through Resend (free tier) when RESEND_API_KEY is set. Without it, local
// development and tests save each email as a JSON file in DATA_DIR/outbox instead.

export type Email = { to: string; subject: string; text: string; html?: string; replyTo?: string };

export class EmailNotConfiguredError extends Error {
  constructor() {
    super('Email is not set up. Add RESEND_API_KEY in Vercel (free at resend.com), then redeploy.');
  }
}

export function canSendEmail() {
  return Boolean(process.env.RESEND_API_KEY) || storageMode() === 'file';
}

export async function sendEmail(email: Email) {
  const key = process.env.RESEND_API_KEY;
  if (key) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM || 'Portfolio <onboarding@resend.dev>',
        to: [email.to],
        reply_to: email.replyTo,
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
    });
    if (!res.ok) throw new Error(`Resend returned ${res.status}: ${await res.text().catch(() => '')}`);
    return;
  }
  if (storageMode() !== 'file') throw new EmailNotConfiguredError();
  const dir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.DATA_DIR || '.data', 'outbox');
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(/*turbopackIgnore: true*/ dir, `${Date.now()}.json`);
  await fs.writeFile(file, JSON.stringify(email, null, 2));
  console.info(`Email not sent (no RESEND_API_KEY); saved to ${file}`);
}
