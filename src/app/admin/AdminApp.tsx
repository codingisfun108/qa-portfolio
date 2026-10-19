'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SECTION_LABELS, type Content, type Message } from '@/lib/schema';
import { hiddenReason } from '@/lib/visibility';
import { AreaField, Card, LinesField, ListEditor, TextField, Toggle, UploadField, newId } from './fields';

type Props = {
  initialContent: Content;
  initialMessages: Message[];
  email: string;
  storage: 'redis' | 'file' | 'readonly';
  uploads: 'blob' | 'local' | 'none';
  emailAlerts: boolean;
};

type Tab =
  | 'profile'
  | 'hero'
  | 'sections'
  | 'signoff'
  | 'projects'
  | 'experience'
  | 'impact'
  | 'toolkit'
  | 'recognition'
  | 'certifications'
  | 'posts'
  | 'now'
  | 'inbox'
  | 'seo'
  | 'settings';

const GROUPS: { label: string; tabs: [Tab, string][] }[] = [
  { label: 'Content', tabs: [['profile', 'Profile and contact'], ['hero', 'Hero'], ['signoff', 'Sign-off panel'], ['projects', 'Projects'], ['experience', 'Experience'], ['impact', 'Impact numbers'], ['toolkit', 'Toolkit'], ['recognition', 'Recognition'], ['certifications', 'Certifications'], ['posts', 'Writing'], ['now', 'Now and education']] },
  { label: 'Site', tabs: [['sections', 'Sections and order'], ['inbox', 'Inbox'], ['seo', 'SEO and sharing'], ['settings', 'Backup and security']] },
];

const EMPTY_HINT: Record<Content['sections'][number]['id'], string> = {
  signoff: 'Add at least one check in Sign-off panel.',
  projects: 'Add a project, or turn on Show on site for one, in Projects.',
  impact: 'Add a number in Impact numbers.',
  experience: 'Add a job, or turn on Show on site for one, in Experience.',
  recognition: 'Add an item in Recognition.',
  toolkit: 'Add a tool or a How I work line in Toolkit.',
  certifications: 'Add a certification in Certifications.',
  blog: 'Publish a post in Writing.',
  now: 'Add a line or an education entry in Now and education.',
  contact: 'Add an email, phone, LinkedIn, GitHub or resume, or turn on the contact form, in Profile and contact.',
};

type Banner = { kind: 'ok' | 'err' | 'info'; text: string; issues?: { path: string; message: string }[] } | null;

const clone = <T,>(v: T): T => structuredClone(v);
const today = () => new Date().toISOString().slice(0, 10);
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export function AdminApp({ initialContent, initialMessages, email, storage, uploads, emailAlerts }: Props) {
  const [content, setContent] = useState<Content>(initialContent);
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(initialContent));
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [tab, setTab] = useState<Tab>('profile');
  const [banner, setBanner] = useState<Banner>(null);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const dirty = useMemo(() => JSON.stringify(content) !== savedJson, [content, savedJson]);
  const unread = messages.filter((m) => !m.read).length;

  const update = useCallback((fn: (draft: Content) => void) => {
    setContent((c) => {
      const next = clone(c);
      fn(next);
      return next;
    });
  }, []);

  const save = useCallback(
    async (body: unknown = content, successText = 'Saved. The live site is updated.') => {
      setSaving(true);
      setBanner(null);
      try {
        const res = await fetch('/api/admin/content', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          window.location.assign('/admin/login');
          return;
        }
        if (!res.ok) {
          setBanner({ kind: 'err', text: data.error || 'Saving failed.', issues: data.issues });
          return;
        }
        setContent(data as Content);
        setSavedJson(JSON.stringify(data));
        setBanner({ kind: 'ok', text: successText });
      } catch {
        setBanner({ kind: 'err', text: 'Saving failed. Check your connection and try again.' });
      } finally {
        setSaving(false);
      }
    },
    [content],
  );

  // Ctrl/Cmd+S saves; leaving with unsaved changes asks first.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveRef.current();
      }
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onLeave);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', onLeave);
    };
  }, [dirty]);

  async function logout(everywhere = false) {
    await fetch('/api/admin/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ everywhere }),
    });
    window.location.assign('/admin/login');
  }

  const { site, hero } = content;

  return (
    <div className="adm-shell" data-ready={ready ? 'true' : undefined}>
      <aside className="adm-side">
        <div className="adm-brand">
          <span className="adm-mark">{site.initials}</span>
          <div>
            <strong>Portfolio admin</strong>
            <span className="adm-muted adm-small">{email}</span>
          </div>
        </div>
        <label className="adm-mobile-nav">
          <span className="sr-only">Section to edit</span>
          <select value={tab} onChange={(e) => setTab(e.target.value as Tab)}>
            {GROUPS.flatMap((g) => g.tabs).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
                {id === 'inbox' && unread ? ` (${unread})` : ''}
              </option>
            ))}
          </select>
        </label>
        <nav className="adm-nav" aria-label="Admin sections">
          {GROUPS.map((g) => (
            <div key={g.label}>
              <p className="adm-nav-group">{g.label}</p>
              {g.tabs.map(([id, label]) => (
                <button key={id} type="button" className={tab === id ? 'active' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
                  {label}
                  {id === 'inbox' && unread > 0 && <span className="adm-count">{unread}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="adm-side-foot">
          <a className="adm-btn ghost wide" href="/" target="_blank" rel="noopener noreferrer">
            View live site
          </a>
          <button className="adm-btn ghost wide" type="button" onClick={() => logout()}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="adm-main">
        <div className="adm-savebar" role="region" aria-label="Save changes">
          <span className={`adm-state ${dirty ? 'dirty' : ''}`}>{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
          <div className="adm-row">
            {dirty && (
              <button className="adm-btn ghost" type="button" onClick={() => setContent(JSON.parse(savedJson))}>
                Discard
              </button>
            )}
            <button className="adm-btn primary" type="button" disabled={!dirty || saving} onClick={() => save()}>
              {saving ? 'Saving…' : 'Save and publish'}
            </button>
          </div>
        </div>

        {storage === 'readonly' && (
          <div className="adm-alert warn" role="alert">
            <strong>Saving is off: storage isn&apos;t connected.</strong> In Vercel, open this project, then Storage, add <em>Upstash for Redis</em>,
            connect it, and redeploy. The site shows the starting content until then.
          </div>
        )}
        {banner && (
          <div className={`adm-alert ${banner.kind === 'err' ? 'err' : 'ok'}`} role={banner.kind === 'err' ? 'alert' : 'status'}>
            <p>{banner.text}</p>
            {banner.issues && (
              <ul>
                {banner.issues.map((i, k) => (
                  <li key={k}>
                    <code>{i.path}</code>: {i.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'profile' && (
          <>
            <Card title="Profile" description="Your name, role and the photo in the hero.">
              <div className="adm-grid">
                <TextField label="Full name" value={site.name} onChange={(v) => update((d) => void (d.site.name = v))} />
                <TextField label="First name" hint="Used in the header and greeting." value={site.firstName} onChange={(v) => update((d) => void (d.site.firstName = v))} />
                <TextField label="Initials" hint="Shown in the logo mark." maxLength={4} value={site.initials} onChange={(v) => update((d) => void (d.site.initials = v))} />
                <TextField label="Role" value={site.role} onChange={(v) => update((d) => void (d.site.role = v))} />
                <TextField label="Location" value={site.location} onChange={(v) => update((d) => void (d.site.location = v))} />
                <TextField label="Availability badge" value={site.availability} onChange={(v) => update((d) => void (d.site.availability = v))} />
              </div>
              <Toggle label="Show availability badge" hint="Turn off when you're not looking." checked={site.showAvailability} onChange={(v) => update((d) => void (d.site.showAvailability = v))} />
              <UploadField label="Photo" kind="image" accept="image/jpeg,image/png,image/webp,image/avif" hint="Square photo, at least 800 × 800 px, under 4 MB. Leave empty to show your initials." value={site.photoUrl} onChange={(v) => update((d) => void (d.site.photoUrl = v))} />
            </Card>
            <Card title="Resume" description="The PDF behind every resume button.">
              <UploadField label="Resume PDF" kind="pdf" accept="application/pdf" hint="Remember: anything in this PDF, including your phone number, is public." value={site.resumeUrl} onChange={(v) => update((d) => void (d.site.resumeUrl = v))} />
              <TextField label="Hero button text" value={site.resumeLabel} onChange={(v) => update((d) => void (d.site.resumeLabel = v))} />
            </Card>
            <Card title="Contact details" description="Empty fields are hidden on the site.">
              <div className="adm-grid">
                <TextField label="Email" type="email" value={site.email} onChange={(v) => update((d) => void (d.site.email = v))} />
                <TextField label="Phone" value={site.phone} onChange={(v) => update((d) => void (d.site.phone = v))} />
                <TextField label="LinkedIn URL" type="url" value={site.linkedin} onChange={(v) => update((d) => void (d.site.linkedin = v))} />
                <TextField label="GitHub URL" type="url" value={site.github} onChange={(v) => update((d) => void (d.site.github = v))} />
              </div>
              <Toggle label="Show phone card" hint="Visitors tap Show number to see it, so scrapers can't read it from the page." checked={site.showPhone} onChange={(v) => update((d) => void (d.site.showPhone = v))} />
            </Card>
            <Card title="Contact form">
              <Toggle label="Show the contact form" hint="Messages land in Inbox." checked={content.contact.formEnabled} onChange={(v) => update((d) => void (d.contact.formEnabled = v))} />
              <TextField label="Text above the form" value={content.contact.formIntro} onChange={(v) => update((d) => void (d.contact.formIntro = v))} />
            </Card>
          </>
        )}

        {tab === 'hero' && (
          <Card title="Hero" description="The first screen visitors see.">
            <TextField label="Greeting" value={hero.greeting} onChange={(v) => update((d) => void (d.hero.greeting = v))} />
            <TextField label="Headline" hint="One line that says what you do. Keep it under 60 characters." value={hero.headline} onChange={(v) => update((d) => void (d.hero.headline = v))} />
            <AreaField label="Intro" rows={4} value={hero.intro} onChange={(v) => update((d) => void (d.hero.intro = v))} />
            <h3 className="adm-sub">Stats (up to 4)</h3>
            <ListEditor
              items={hero.stats}
              max={4}
              addLabel="Add stat"
              create={() => ({ value: '', label: '' })}
              title={(s) => [s.value, s.label].filter(Boolean).join(' ')}
              onChange={(v) => update((d) => void (d.hero.stats = v))}
              render={(s, set) => (
                <div className="adm-grid">
                  <TextField label="Value" placeholder="9+" value={s.value} onChange={(v) => set({ value: v })} />
                  <TextField label="Label" placeholder="years in QA" value={s.label} onChange={(v) => set({ label: v })} />
                </div>
              )}
            />
          </Card>
        )}

        {tab === 'signoff' && (
          <Card title="Release sign-off panel" description="The animated test run. Each check ticks off as visitors scroll to it.">
            <div className="adm-grid">
              <TextField label="File name" value={content.signoff.fileName} onChange={(v) => update((d) => void (d.signoff.fileName = v))} />
              <TextField label="Command" value={content.signoff.command} onChange={(v) => update((d) => void (d.signoff.command = v))} />
            </div>
            <TextField label="Result line" value={content.signoff.resultText} onChange={(v) => update((d) => void (d.signoff.resultText = v))} />
            <h3 className="adm-sub">Checks</h3>
            <ListEditor
              items={content.signoff.checks}
              max={12}
              addLabel="Add check"
              create={() => ({ gate: '', detail: '' })}
              title={(c) => c.gate}
              onChange={(v) => update((d) => void (d.signoff.checks = v))}
              render={(c, set) => (
                <div className="adm-grid">
                  <TextField label="Check" value={c.gate} onChange={(v) => set({ gate: v })} />
                  <TextField label="Detail" value={c.detail} onChange={(v) => set({ detail: v })} />
                </div>
              )}
            />
          </Card>
        )}

        {tab === 'projects' && (
          <Card title="Projects" description="Hidden projects stay saved but don't appear on the site.">
            <ListEditor
              items={content.projects}
              addLabel="Add project"
              create={() => ({ id: newId(), visible: true, title: 'New project', domain: '', status: 'Shipped', summary: '', role: '', tested: [], link: '' })}
              title={(p) => p.title}
              badge={(p) => (p.visible ? null : 'Hidden')}
              onChange={(v) => update((d) => void (d.projects = v))}
              render={(p, set) => (
                <>
                  <Toggle label="Show on site" checked={p.visible} onChange={(v) => set({ visible: v })} />
                  <div className="adm-grid">
                    <TextField label="Title" value={p.title} onChange={(v) => set({ title: v })} />
                    <TextField label="Domain" placeholder="EdTech" value={p.domain} onChange={(v) => set({ domain: v })} />
                    <TextField label="Badge" placeholder="Live, Shipped, Releasing soon" value={p.status} onChange={(v) => set({ status: v })} />
                    <TextField label="Your role" value={p.role} onChange={(v) => set({ role: v })} />
                  </div>
                  <AreaField label="Summary" value={p.summary} onChange={(v) => set({ summary: v })} />
                  <LinesField label="Testing scope" value={p.tested} onChange={(v) => set({ tested: v })} />
                  <TextField label="Link (optional)" type="url" value={p.link} onChange={(v) => set({ link: v })} />
                </>
              )}
            />
          </Card>
        )}

        {tab === 'experience' && (
          <Card title="Experience" description="Newest first. Mark your current job to show the Current role badge.">
            <ListEditor
              items={content.experience}
              addLabel="Add job"
              create={() => ({ id: newId(), visible: true, title: 'Job title', company: '', place: '', period: '', current: false, points: [] })}
              title={(j) => [j.title, j.company].filter(Boolean).join(', ')}
              badge={(j) => (!j.visible ? 'Hidden' : j.current ? 'Current' : null)}
              onChange={(v) => update((d) => void (d.experience = v))}
              render={(j, set) => (
                <>
                  <div className="adm-row adm-wraps">
                    <Toggle label="Show on site" checked={j.visible} onChange={(v) => set({ visible: v })} />
                    <Toggle label="Current role" checked={j.current} onChange={(v) => set({ current: v })} />
                  </div>
                  <div className="adm-grid">
                    <TextField label="Job title" value={j.title} onChange={(v) => set({ title: v })} />
                    <TextField label="Company" value={j.company} onChange={(v) => set({ company: v })} />
                    <TextField label="Location" value={j.place} onChange={(v) => set({ place: v })} />
                    <TextField label="Dates" placeholder="Feb 2026 – Present" value={j.period} onChange={(v) => set({ period: v })} />
                  </div>
                  <LinesField label="Achievements" rows={6} hint="One bullet per line. Lead with the result and a number." value={j.points} onChange={(v) => set({ points: v })} />
                </>
              )}
            />
            <AreaField label="Earlier career (optional)" hint="One short paragraph under the timeline." value={content.earlier} onChange={(v) => update((d) => void (d.earlier = v))} />
          </Card>
        )}

        {tab === 'impact' && (
          <Card title="Impact numbers" description="Big figures with where each came from. Three or six read best.">
            <ListEditor
              items={content.impact}
              max={12}
              addLabel="Add number"
              create={() => ({ value: '', label: '', source: '' })}
              title={(m) => [m.value, m.label].filter(Boolean).join(' ')}
              onChange={(v) => update((d) => void (d.impact = v))}
              render={(m, set) => (
                <div className="adm-grid three">
                  <TextField label="Value" placeholder="95%" value={m.value} onChange={(v) => set({ value: v })} />
                  <TextField label="What it measures" value={m.label} onChange={(v) => set({ label: v })} />
                  <TextField label="Source" placeholder="Company or project" value={m.source} onChange={(v) => set({ source: v })} />
                </div>
              )}
            />
          </Card>
        )}

        {tab === 'toolkit' && (
          <Card title="Toolkit" description="Add a tag (e.g. Current focus) to highlight a tool.">
            <ListEditor
              items={content.toolkit}
              max={30}
              addLabel="Add tool"
              create={() => ({ name: '', use: '', tag: '' })}
              title={(t) => t.name}
              badge={(t) => t.tag || null}
              onChange={(v) => update((d) => void (d.toolkit = v))}
              render={(t, set) => (
                <div className="adm-grid three">
                  <TextField label="Tool" value={t.name} onChange={(v) => set({ name: v })} />
                  <TextField label="What you use it for" value={t.use} onChange={(v) => set({ use: v })} />
                  <TextField label="Tag (optional)" value={t.tag} onChange={(v) => set({ tag: v })} />
                </div>
              )}
            />
            <LinesField label="How I work" value={content.practices} onChange={(v) => update((d) => void (d.practices = v))} />
          </Card>
        )}

        {tab === 'recognition' && (
          <Card title="Recognition" description="Awards, appreciation emails and client feedback. Turn the section on in Sections and order.">
            <ListEditor
              items={content.recognition}
              max={20}
              addLabel="Add recognition"
              create={() => ({ id: newId(), visible: true, title: 'Award or appreciation', from: '', date: '', quote: '', imageUrl: '', link: '' })}
              title={(r) => r.title}
              badge={(r) => (r.visible ? null : 'Hidden')}
              onChange={(v) => update((d) => void (d.recognition = v))}
              render={(r, set) => (
                <>
                  <Toggle label="Show on site" checked={r.visible} onChange={(v) => set({ visible: v })} />
                  <div className="adm-grid three">
                    <TextField label="Title" value={r.title} onChange={(v) => set({ title: v })} />
                    <TextField label="From" placeholder="Client or company" value={r.from} onChange={(v) => set({ from: v })} />
                    <TextField label="Date" placeholder="Mar 2026" value={r.date} onChange={(v) => set({ date: v })} />
                  </div>
                  <AreaField label="Quote" hint="Use their exact words, with permission." value={r.quote} onChange={(v) => set({ quote: v })} />
                  <UploadField label="Image (certificate, trophy, email screenshot)" kind="image" accept="image/jpeg,image/png,image/webp,image/avif" value={r.imageUrl} onChange={(v) => set({ imageUrl: v })} />
                  <TextField label="Link (optional)" type="url" value={r.link} onChange={(v) => set({ link: v })} />
                </>
              )}
            />
          </Card>
        )}

        {tab === 'certifications' && (
          <Card title="Certifications" description="ISTQB, Playwright, cloud or AI courses. Turn the section on in Sections and order.">
            <ListEditor
              items={content.certifications}
              max={20}
              addLabel="Add certification"
              create={() => ({ id: newId(), name: '', issuer: '', year: '', link: '' })}
              title={(c) => c.name}
              onChange={(v) => update((d) => void (d.certifications = v))}
              render={(c, set) => (
                <div className="adm-grid">
                  <TextField label="Name" placeholder="ISTQB Foundation Level" value={c.name} onChange={(v) => set({ name: v })} />
                  <TextField label="Issuer" value={c.issuer} onChange={(v) => set({ issuer: v })} />
                  <TextField label="Year" value={c.year} onChange={(v) => set({ year: v })} />
                  <TextField label="Credential link" type="url" value={c.link} onChange={(v) => set({ link: v })} />
                </div>
              )}
            />
          </Card>
        )}

        {tab === 'posts' && (
          <Card title="Writing" description="Posts are written in Markdown. Drafts stay private until you turn on Published.">
            <ListEditor
              items={content.posts}
              max={100}
              addLabel="New post"
              create={() => ({ slug: `post-${newId()}`, published: false, title: 'Untitled post', date: today(), summary: '', tags: [], body: '' })}
              title={(p) => p.title}
              badge={(p) => (p.published ? 'Published' : 'Draft')}
              onChange={(v) => update((d) => void (d.posts = v))}
              render={(p, set) => (
                <>
                  <Toggle label="Published" hint="Also turn on the Writing section in Sections and order." checked={p.published} onChange={(v) => set({ published: v })} />
                  <div className="adm-grid">
                    <TextField label="Title" value={p.title} onChange={(v) => set({ title: v })} />
                    <TextField label="Date" type="date" value={p.date} onChange={(v) => set({ date: v })} />
                  </div>
                  <div className="adm-grid">
                    <TextField label="URL slug" hint={`Address: /blog/${p.slug}`} value={p.slug} onChange={(v) => set({ slug: slugify(v) })} />
                    <div className="adm-field">
                      <span className="adm-label-spacer" aria-hidden="true">
                        &nbsp;
                      </span>
                      <button className="adm-btn small ghost" type="button" onClick={() => set({ slug: slugify(p.title) })}>
                        Make slug from title
                      </button>
                    </div>
                  </div>
                  <AreaField label="Summary" hint="Shown in lists and link previews." value={p.summary} onChange={(v) => set({ summary: v })} />
                  <LinesField label="Tags" rows={2} value={p.tags} onChange={(v) => set({ tags: v })} />
                  <AreaField label="Body (Markdown)" rows={16} mono hint="## for headings, - for bullets, **bold**, [text](https://link)." value={p.body} onChange={(v) => set({ body: v })} />
                  {p.published && (
                    <a className="adm-btn small ghost" href={`/blog/${p.slug}`} target="_blank" rel="noopener noreferrer">
                      Open published post
                    </a>
                  )}
                </>
              )}
            />
          </Card>
        )}

        {tab === 'now' && (
          <Card title="Now and education">
            <LinesField label="What I'm working on now" value={content.now} onChange={(v) => update((d) => void (d.now = v))} />
            <h3 className="adm-sub">Education</h3>
            <ListEditor
              items={content.education}
              max={6}
              addLabel="Add education"
              create={() => ({ degree: '', school: '', year: '' })}
              title={(e) => e.degree}
              onChange={(v) => update((d) => void (d.education = v))}
              render={(e, set) => (
                <div className="adm-grid three">
                  <TextField label="Degree" value={e.degree} onChange={(v) => set({ degree: v })} />
                  <TextField label="School" value={e.school} onChange={(v) => set({ school: v })} />
                  <TextField label="Year" value={e.year} onChange={(v) => set({ year: v })} />
                </div>
              )}
            />
          </Card>
        )}

        {tab === 'sections' && (
          <Card title="Sections and order" description="Turn sections on or off, rename them, and drag the order with the arrows. The hero always comes first.">
            <ListEditor
              items={content.sections}
              max={content.sections.length}
              removable={false}
              addLabel="Add section"
              create={() => content.sections[0]}
              title={(s) => `${SECTION_LABELS[s.id]}${s.title && s.title !== SECTION_LABELS[s.id] ? `: ${s.title}` : ''}`}
              badge={(s) => hiddenReason(s, content) ?? (s.inNav ? 'In menu' : null)}
              onChange={(v) => update((d) => void (d.sections = v))}
              render={(s, set) => (
                <>
                  <div className="adm-row adm-wraps">
                    <Toggle label="Show section" checked={s.visible} onChange={(v) => set({ visible: v })} />
                    {s.id !== 'signoff' && s.id !== 'now' && s.id !== 'contact' && (
                      <Toggle label="Show in top menu" checked={s.inNav} onChange={(v) => set({ inNav: v })} />
                    )}
                  </div>
                  <div className="adm-grid">
                    <TextField label="Heading" value={s.title} onChange={(v) => set({ title: v })} />
                    <TextField label="Menu label" value={s.navLabel} onChange={(v) => set({ navLabel: v })} />
                  </div>
                  <AreaField label="Intro line" rows={2} value={s.subtitle} onChange={(v) => set({ subtitle: v })} />
                  {hiddenReason(s, content) === 'Empty, so hidden' && (
                    <p className="adm-alert warn adm-small">
                      This section is on but has nothing to show, so visitors won&apos;t see it and it&apos;s left out of the menu. {EMPTY_HINT[s.id]}
                    </p>
                  )}
                </>
              )}
            />
          </Card>
        )}

        {tab === 'inbox' && (
          <Inbox messages={messages} setMessages={setMessages} emailAlerts={emailAlerts} />
        )}

        {tab === 'seo' && (
          <Card title="SEO and sharing" description="How the site appears in Google and in link previews on LinkedIn and WhatsApp.">
            <TextField label="Page title" hint={`${site.seoTitle.length}/60 characters`} value={site.seoTitle} onChange={(v) => update((d) => void (d.site.seoTitle = v))} />
            <AreaField label="Description" hint={`${site.seoDescription.length}/160 characters`} value={site.seoDescription} onChange={(v) => update((d) => void (d.site.seoDescription = v))} />
            <TextField label="Site address" type="url" hint="Your final URL, e.g. https://rahulsharma.vercel.app. Used for the sitemap and link previews." value={site.siteUrl} onChange={(v) => update((d) => void (d.site.siteUrl = v))} />
            <TextField label="GitHub repo of this site" type="url" hint="Adds a See the tests link in the footer." value={site.repoUrl} onChange={(v) => update((d) => void (d.site.repoUrl = v))} />
            <p className="adm-hint">
              Preview card image: <a href="/opengraph-image" target="_blank" rel="noopener noreferrer">open it</a>. It's generated from your name, headline and checks.
            </p>
          </Card>
        )}

        {tab === 'settings' && (
          <Settings content={content} storage={storage} uploads={uploads} onImport={(c) => setContent(c)} onReset={() => save({ reset: true }, 'Starting content restored.')} onLogoutEverywhere={() => logout(true)} />
        )}
      </main>
    </div>
  );
}

function Inbox({ messages, setMessages, emailAlerts }: { messages: Message[]; setMessages: (m: Message[]) => void; emailAlerts: boolean }) {
  const [error, setError] = useState('');
  async function call(method: 'PATCH' | 'DELETE', body: object) {
    setError('');
    const res = await fetch('/api/admin/messages', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) setMessages(await res.json());
    else setError('That didn’t work. Refresh and try again.');
  }
  return (
    <Card title="Inbox" description={emailAlerts ? 'New messages are also emailed to you.' : 'Tip: set RESEND_API_KEY and NOTIFY_EMAIL in Vercel to get an email for each new message.'}>
      {error && <p className="adm-error">{error}</p>}
      {messages.length === 0 ? (
        <p className="adm-empty">No messages yet. They appear here when someone uses the contact form.</p>
      ) : (
        <ul className="adm-inbox">
          {messages.map((m) => (
            <li key={m.id} className={m.read ? 'read' : 'unread'} data-testid="inbox-message">
              <div className="adm-inbox-head">
                <strong>{m.name}</strong>
                {m.company && <span className="adm-muted"> · {m.company}</span>}
                <span className="adm-muted adm-small">{new Date(m.receivedAt).toLocaleString()}</span>
              </div>
              <p className="adm-inbox-body">{m.message}</p>
              <div className="adm-row">
                <a className="adm-btn small primary" href={`mailto:${m.email}?subject=${encodeURIComponent('Re: your message on my portfolio')}`}>
                  Reply to {m.email}
                </a>
                <button className="adm-btn small ghost" type="button" onClick={() => call('PATCH', { id: m.id, read: !m.read })}>
                  Mark as {m.read ? 'unread' : 'read'}
                </button>
                <button className="adm-btn small danger" type="button" onClick={() => call('DELETE', { id: m.id })}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Settings({
  content,
  storage,
  uploads,
  onImport,
  onReset,
  onLogoutEverywhere,
}: {
  content: Content;
  storage: Props['storage'];
  uploads: Props['uploads'];
  onImport: (c: Content) => void;
  onReset: () => void;
  onLogoutEverywhere: () => void;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  function exportJson() {
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `portfolio-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <Card title="Storage status">
        <ul className="adm-status">
          <li className={storage === 'readonly' ? 'bad' : 'good'}>
            Content: {storage === 'redis' ? 'Upstash Redis (connected)' : storage === 'file' ? 'Local files (development)' : 'Not connected, saving is off'}
          </li>
          <li className={uploads === 'none' ? 'bad' : 'good'}>
            Uploads: {uploads === 'blob' ? 'Vercel Blob (connected)' : uploads === 'local' ? 'Local files (development)' : 'Not connected, add Vercel Blob to upload files'}
          </li>
        </ul>
      </Card>
      <Card title="Backup" description="Download everything as one JSON file. Restore it here any time.">
        <div className="adm-row adm-wraps">
          <button className="adm-btn" type="button" onClick={exportJson}>
            Download backup
          </button>
          <label className="adm-btn ghost">
            Restore from backup
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                try {
                  const data = JSON.parse(await f.text());
                  if (data?.version !== 1 || !data.site) throw new Error();
                  onImport(data);
                  setImportMsg('Backup loaded. Review it, then Save and publish.');
                } catch {
                  setImportMsg('That file is not a portfolio backup.');
                }
              }}
            />
          </label>
        </div>
        {importMsg && <p className="adm-hint">{importMsg}</p>}
      </Card>
      <Card title="Reset" description="Replace everything with the starting content from the code. Download a backup first.">
        {confirmReset ? (
          <div className="adm-row">
            <button className="adm-btn danger" type="button" onClick={onReset}>
              Yes, reset everything
            </button>
            <button className="adm-btn ghost" type="button" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="adm-btn ghost" type="button" onClick={() => setConfirmReset(true)}>
            Reset to starting content
          </button>
        )}
      </Card>
      <Card title="Security">
        <p className="adm-muted">
          To change your password, run <code>npm run hash-password</code>, paste the new value into <code>ADMIN_PASSWORD_HASH</code> in Vercel and redeploy. Every
          existing session ends automatically.
        </p>
        <button className="adm-btn ghost" type="button" onClick={onLogoutEverywhere}>
          Sign out on all devices
        </button>
      </Card>
    </>
  );
}
