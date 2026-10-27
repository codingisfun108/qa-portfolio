import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'node:crypto';

// Signed session token for the single admin. Used by proxy.ts (cheap check, no storage)
// and by requireAdmin() in server code (full check, including "sign out everywhere").

export const SESSION_COOKIE = 'qa_admin_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type AdminConfig = { email: string; passwordHash: string; secret: Uint8Array };

export function getAdminConfig(): AdminConfig | null {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  const secret = process.env.SESSION_SECRET?.trim();
  if (!email || !passwordHash || !secret || secret.length < 32) return null;
  return { email, passwordHash, secret: new TextEncoder().encode(secret) };
}

/** Changes whenever the password hash changes, so a new password ends every old session. */
export function passwordVersion(hash: string) {
  return createHash('sha256').update(hash).digest('base64url').slice(0, 12);
}

export async function createSessionToken(config: AdminConfig): Promise<string> {
  return new SignJWT({ pwv: passwordVersion(config.passwordHash) })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(config.email)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(config.secret);
}

export async function verifySessionToken(token: string | undefined): Promise<{ email: string; iat: number } | null> {
  const config = getAdminConfig();
  if (!config || !token) return null;
  try {
    const { payload } = await jwtVerify(token, config.secret, { algorithms: ['HS256'] });
    if (payload.sub !== config.email) return null;
    if (payload.pwv !== passwordVersion(config.passwordHash)) return null;
    return { email: payload.sub, iat: payload.iat ?? 0 };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}
