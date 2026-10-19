'use client';

import { useEffect, useState } from 'react';

type Status = { kind: 'idle' | 'sending' | 'ok' | 'err'; text: string };

export function ContactForm({ intro }: { intro: string }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle', text: '' });
  // Disabled until JavaScript is running, so an early tap can't fall back to a browser
  // form submit that would put the visitor's details in the URL.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    setStatus({ kind: 'sending', text: 'Sending…' });
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || 'Your message could not be sent. Email me directly instead.');
      form.reset();
      setStatus({ kind: 'ok', text: "Message sent. I'll reply by email." });
    } catch (err) {
      setStatus({ kind: 'err', text: err instanceof Error ? err.message : 'Your message could not be sent.' });
    }
  }

  return (
    <form className="contact-form" method="post" onSubmit={onSubmit} aria-labelledby="form-title">
      <div>
        <h3 id="form-title">Send a message</h3>
        {intro && <p className="form-intro">{intro}</p>}
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="cf-name">Your name</label>
          <input id="cf-name" name="name" required maxLength={100} autoComplete="name" />
        </div>
        <div className="field">
          <label htmlFor="cf-email">Your email</label>
          <input id="cf-email" name="email" type="email" required maxLength={200} autoComplete="email" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="cf-company">Company (optional)</label>
        <input id="cf-company" name="company" maxLength={120} autoComplete="organization" />
      </div>
      <div className="field">
        <label htmlFor="cf-message">Message</label>
        <textarea id="cf-message" name="message" required minLength={10} maxLength={4000} />
      </div>
      <div className="hp" aria-hidden="true">
        <label htmlFor="cf-website">Leave this empty</label>
        <input id="cf-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="cactions">
        <button className="btn primary" type="submit" disabled={!ready || status.kind === 'sending'}>
          {status.kind === 'sending' ? 'Sending…' : 'Send message'}
        </button>
      </div>
      <p className={`form-status ${status.kind === 'ok' ? 'ok' : status.kind === 'err' ? 'err' : ''}`} role="status" aria-live="polite">
        {status.kind === 'ok' || status.kind === 'err' ? status.text : ''}
      </p>
    </form>
  );
}
