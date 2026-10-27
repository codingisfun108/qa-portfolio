import 'server-only';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { sendEmail } from './email';
import { hashPassword } from './password';
import { passwordVersion, type AdminConfig } from './session';
import { bumpSessionEpoch, getContent, getResetRequest, getStoredPassword, saveResetRequest, saveStoredPassword } from './store';

// "Forgot password": a 6-digit code is emailed to ADMIN_EMAIL, and entering it with a new
// password saves that password's hash in storage. Vercel env vars can't be changed from the
// app, so the stored hash overrides ADMIN_PASSWORD_HASH until a different hash is put there.

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
export const MIN_PASSWORD_LENGTH = 12;

/** The hash sign-in checks: a reset password, unless ADMIN_PASSWORD_HASH has changed since. */
export async function activePasswordHash(config: AdminConfig): Promise<string> {
  try {
    const stored = await getStoredPassword();
    if (stored && stored.base === passwordVersion(config.passwordHash)) return stored.hash;
  } catch (err) {
    console.error('Could not read stored password; using ADMIN_PASSWORD_HASH.', err);
  }
  return config.passwordHash;
}

// Keyed with SESSION_SECRET so a leaked storage record can't be brute-forced offline.
function codeHash(config: AdminConfig, code: string) {
  return createHmac('sha256', config.secret).update(`password-reset:${code}`).digest('base64url');
}

function sameHash(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Emails a code when `email` is the admin's. Does nothing otherwise, so callers reply the same either way. */
export async function requestPasswordReset(config: AdminConfig, email: string) {
  if (email !== config.email) return;
  const now = Date.now();
  const pending = await getResetRequest();
  if (pending && pending.expiresAt > now && now - pending.createdAt < RESEND_COOLDOWN_MS) return;

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await saveResetRequest({ codeHash: codeHash(config, code), createdAt: now, expiresAt: now + CODE_TTL_MS, attempts: 0 });

  const { site } = await getContent();
  const minutes = CODE_TTL_MS / 60_000;
  await sendEmail({
    to: config.email,
    subject: `${code} is your ${site.name} admin reset code`,
    text: [
      `Someone asked to reset the admin password for ${site.name}.`,
      '',
      `Your code: ${code}`,
      '',
      `It works once and expires in ${minutes} minutes.`,
      "If this wasn't you, ignore this email. Your password stays the same.",
    ].join('\n'),
    html: resetEmailHtml(site.name, code, minutes),
  });
}

export type ResetResult = { ok: true } | { ok: false; error: string };

export async function completePasswordReset(config: AdminConfig, email: string, code: string, newPassword: string): Promise<ResetResult> {
  const invalid: ResetResult = { ok: false, error: 'That code is incorrect or has expired. Request a new code.' };
  const pending = await getResetRequest();
  if (!pending || email !== config.email) return invalid;
  if (pending.expiresAt <= Date.now() || pending.attempts >= MAX_ATTEMPTS) {
    await saveResetRequest(null);
    return invalid;
  }
  if (!sameHash(codeHash(config, code), pending.codeHash)) {
    const attempts = pending.attempts + 1;
    await saveResetRequest(attempts >= MAX_ATTEMPTS ? null : { ...pending, attempts });
    return invalid;
  }

  await saveStoredPassword({ hash: await hashPassword(newPassword), base: passwordVersion(config.passwordHash) });
  await saveResetRequest(null);
  await bumpSessionEpoch();
  return { ok: true };
}

function resetEmailHtml(siteName: string, code: string, minutes: number) {
  const name = siteName.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px">
            <tr>
              <td style="padding:32px">
                <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#2563eb">${name} admin</p>
                <h1 style="margin:0 0 16px;font-size:22px">Reset your password</h1>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.5">Enter this code on the reset page to choose a new password.</p>
                <p style="margin:0 0 20px;padding:16px;background:#f4f4f5;border-radius:8px;text-align:center;font-family:Menlo,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:8px">${code}</p>
                <p style="margin:0 0 8px;font-size:14px;color:#52525b">It works once and expires in ${minutes} minutes.</p>
                <p style="margin:0;font-size:14px;color:#52525b">If this wasn't you, ignore this email. Your password stays the same.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
