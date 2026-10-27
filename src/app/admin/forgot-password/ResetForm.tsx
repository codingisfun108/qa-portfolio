'use client';

import { useEffect, useState } from 'react';

type Step = 'email' | 'code' | 'done';

async function post(url: string, data: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(body.error || 'Something went wrong. Try again.');
}

export function ResetForm() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  // Disabled until JavaScript is running, so an early tap never falls back to a browser form submit.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  function sendCode(address: string) {
    return run(async () => {
      await post('/api/admin/password-reset/request', { email: address });
      setEmail(address);
      setNotice(`If ${address} is the admin email, a 6-digit code is on its way. It expires in 10 minutes.`);
      setStep('code');
    });
  }

  function onEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    sendCode(String(new FormData(e.currentTarget).get('email') ?? '').trim());
  }

  function onCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const password = String(data.get('password') ?? '');
    if (password !== data.get('confirm')) {
      setError('The two passwords do not match.');
      return;
    }
    run(async () => {
      await post('/api/admin/password-reset/verify', { email, code: data.get('code'), password });
      setStep('done');
    });
  }

  const errorText = error && (
    <p className="adm-error" role="alert">
      {error}
    </p>
  );

  if (step === 'done') {
    return (
      <div className="adm-form">
        <p className="adm-alert ok" role="status">
          Password changed. You have been signed out on every device.
        </p>
        <a className="adm-btn primary wide" href="/admin/login">
          Sign in
        </a>
      </div>
    );
  }

  if (step === 'code') {
    return (
      <form className="adm-form" method="post" onSubmit={onCode}>
        <p className="adm-muted" role="status">
          {notice}
        </p>
        <div className="adm-field">
          <label htmlFor="reset-code">Code from the email</label>
          <input id="reset-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required />
        </div>
        <div className="adm-field">
          <label htmlFor="reset-password">New password</label>
          <input id="reset-password" name="password" type="password" autoComplete="new-password" minLength={12} required />
          <p className="adm-muted adm-small">At least 12 characters. A short sentence works well.</p>
        </div>
        <div className="adm-field">
          <label htmlFor="reset-confirm">Confirm new password</label>
          <input id="reset-confirm" name="confirm" type="password" autoComplete="new-password" minLength={12} required />
        </div>
        {errorText}
        <button className="adm-btn primary wide" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Reset password'}
        </button>
        <button className="adm-btn ghost wide" type="button" disabled={busy} onClick={() => sendCode(email)}>
          Send a new code
        </button>
      </form>
    );
  }

  return (
    <form className="adm-form" method="post" onSubmit={onEmail}>
      <p className="adm-muted">Enter the admin email. We&apos;ll send a code to reset your password.</p>
      <div className="adm-field">
        <label htmlFor="reset-email">Email</label>
        <input id="reset-email" name="email" type="email" autoComplete="username" required />
      </div>
      {errorText}
      <button className="adm-btn primary wide" type="submit" disabled={busy || !ready}>
        {busy ? 'Sending…' : 'Send code'}
      </button>
    </form>
  );
}
