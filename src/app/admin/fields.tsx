'use client';

import { useId, useState } from 'react';

type Base = { label: string; hint?: string };

export function TextField({
  label,
  hint,
  value,
  onChange,
  type = 'text',
  placeholder,
  maxLength,
}: Base & { value: string; onChange: (v: string) => void; type?: 'text' | 'email' | 'url' | 'date'; placeholder?: string; maxLength?: number }) {
  const id = useId();
  return (
    <div className="adm-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} value={value} placeholder={placeholder} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
      {hint && <p className="adm-hint">{hint}</p>}
    </div>
  );
}

export function AreaField({
  label,
  hint,
  value,
  onChange,
  rows = 3,
  mono,
}: Base & { value: string; onChange: (v: string) => void; rows?: number; mono?: boolean }) {
  const id = useId();
  return (
    <div className="adm-field">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} rows={rows} value={value} className={mono ? 'mono' : undefined} onChange={(e) => onChange(e.target.value)} />
      {hint && <p className="adm-hint">{hint}</p>}
    </div>
  );
}

/** A list of short strings, edited as one line per item. */
// Blank lines are kept while typing and dropped by the server when saving.
export function LinesField({ label, hint, value, onChange, rows = 4 }: Base & { value: string[]; onChange: (v: string[]) => void; rows?: number }) {
  const id = useId();
  return (
    <div className="adm-field">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} rows={rows} value={value.join('\n')} onChange={(e) => onChange(e.target.value.split('\n'))} />
      <p className="adm-hint">{hint ?? 'One item per line.'}</p>
    </div>
  );
}

export function Toggle({ label, hint, checked, onChange }: Base & { checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="adm-toggle">
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>
        <span>{label}</span>
        {hint && <span className="adm-hint">{hint}</span>}
      </label>
    </div>
  );
}

export function UploadField({
  label,
  hint,
  value,
  onChange,
  accept,
  kind,
}: Base & { value: string; onChange: (v: string) => void; accept: string; kind: 'image' | 'pdf' }) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function upload(file: File) {
    setBusy(true);
    setError('');
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !body.url) throw new Error(body.error || 'Upload failed.');
      onChange(body.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adm-field">
      <label htmlFor={id}>{label}</label>
      <div className="adm-upload">
        {value && kind === 'image' && <img src={value} alt="" className="adm-thumb" />}
        <div className="adm-upload-main">
          <input id={id} type="url" value={value} placeholder="https://… or upload a file" onChange={(e) => onChange(e.target.value)} />
          <div className="adm-row">
            <label className="adm-btn small">
              {busy ? 'Uploading…' : kind === 'pdf' ? 'Upload PDF' : 'Upload image'}
              <input
                type="file"
                accept={accept}
                hidden
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(f);
                  e.target.value = '';
                }}
              />
            </label>
            {value && (
              <a className="adm-btn small ghost" href={value} target="_blank" rel="noopener noreferrer">
                Open
              </a>
            )}
            {value && (
              <button className="adm-btn small ghost" type="button" onClick={() => onChange('')}>
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
      {error && <p className="adm-error">{error}</p>}
      {hint && <p className="adm-hint">{hint}</p>}
    </div>
  );
}

/** Reorderable, collapsible list of records. */
export function ListEditor<T>({
  items,
  onChange,
  create,
  title,
  addLabel,
  max = 50,
  render,
  badge,
  removable = true,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  title: (item: T, index: number) => string;
  addLabel: string;
  max?: number;
  badge?: (item: T) => string | null;
  removable?: boolean;
  render: (item: T, update: (patch: Partial<T>) => void, index: number) => React.ReactNode;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<number | null>(null);

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    if (open === i) setOpen(j);
  };

  return (
    <div className="adm-list">
      {items.length === 0 && <p className="adm-empty">Nothing here yet. Add the first one below.</p>}
      {items.map((item, i) => {
        const isOpen = open === i;
        const b = badge?.(item);
        return (
          <div className={`adm-item${isOpen ? ' open' : ''}`} key={i}>
            <div className="adm-item-head">
              <button className="adm-item-title" type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)}>
                <span className="adm-chevron" aria-hidden="true">
                  {isOpen ? '▾' : '▸'}
                </span>
                <span>{title(item, i) || 'Untitled'}</span>
                {b && <span className="adm-pill">{b}</span>}
              </button>
              <div className="adm-item-tools">
                <button type="button" className="adm-icon" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                  ↑
                </button>
                <button type="button" className="adm-icon" aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                  ↓
                </button>
                {!removable ? null : confirm === i ? (
                  <>
                    <button
                      type="button"
                      className="adm-btn small danger"
                      onClick={() => {
                        onChange(items.filter((_, k) => k !== i));
                        setConfirm(null);
                        setOpen(null);
                      }}
                    >
                      Delete
                    </button>
                    <button type="button" className="adm-btn small ghost" onClick={() => setConfirm(null)}>
                      Keep
                    </button>
                  </>
                ) : (
                  <button type="button" className="adm-icon" aria-label="Delete" onClick={() => setConfirm(i)}>
                    ✕
                  </button>
                )}
              </div>
            </div>
            {isOpen && (
              <div className="adm-item-body">
                {render(item, (patch) => onChange(items.map((it, k) => (k === i ? { ...it, ...patch } : it))), i)}
              </div>
            )}
          </div>
        );
      })}
      {items.length < max && (
        <button
          type="button"
          className="adm-btn add"
          onClick={() => {
            onChange([...items, create()]);
            setOpen(items.length);
          }}
        >
          + {addLabel}
        </button>
      )}
    </div>
  );
}

export function Card({ title, children, description }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="adm-card" role="group" aria-label={title}>
      <div className="adm-card-head">
        <h2>{title}</h2>
        {description && <p className="adm-muted">{description}</p>}
      </div>
      <div className="adm-card-body">{children}</div>
    </div>
  );
}

export const newId = () => Math.random().toString(36).slice(2, 10);
