import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import { getAdminConfig } from '@/lib/session';
import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next?.startsWith('/admin') && !next.startsWith('//') ? next : '/admin';
  if (await getAdminSession()) redirect(safeNext);
  const configured = Boolean(getAdminConfig());

  return (
    <main className="adm-login">
      <div className="adm-login-card">
        <p className="adm-eyebrow">Portfolio admin</p>
        <h1>Sign in</h1>
        {configured ? (
          <LoginForm next={safeNext} />
        ) : (
          <div className="adm-alert" role="alert">
            <p>
              <strong>Admin login isn&apos;t set up yet.</strong>
            </p>
            <p>Add these environment variables in Vercel (Project, Settings, Environment Variables), then redeploy:</p>
            <ul>
              <li>
                <code>ADMIN_EMAIL</code>: the email you&apos;ll sign in with
              </li>
              <li>
                <code>ADMIN_PASSWORD_HASH</code>: run <code>npm run hash-password</code> and paste the result
              </li>
              <li>
                <code>SESSION_SECRET</code>: any random string of 32+ characters
              </li>
            </ul>
          </div>
        )}
        <p className="adm-muted adm-small">
          <a href="/">Back to the site</a>
        </p>
      </div>
    </main>
  );
}
