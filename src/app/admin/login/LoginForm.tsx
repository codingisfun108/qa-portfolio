'use client';

import { useEffect, useState } from 'react';

export function LoginForm({ next }: { next: string }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Disabled until JavaScript is running, so an early tap can never fall back to a
  // browser form submit that would put the email and password in the URL.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || 'Sign-in failed. Try again.');
      window.location.assign(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Try again.');
      setBusy(false);
    }
  }

  return (
    <form className="adm-form" method="post" onSubmit={onSubmit}>
      <div className="adm-field">
        <label htmlFor="login-email">Email</label>
        <input id="login-email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="adm-field">
        <label htmlFor="login-password">Password</label>
        <input id="login-password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {error && (
        <p className="adm-error" role="alert">
          {error}
        </p>
      )}
      <button className="adm-btn primary wide" type="submit" disabled={busy || !ready}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
