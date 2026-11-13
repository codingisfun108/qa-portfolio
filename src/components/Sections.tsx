import Link from 'next/link';
import Image from 'next/image';
import type { Content, Section } from '@/lib/schema';
import { isLive, isRendered, renderedSections } from '@/lib/visibility';
import { SignoffRun } from './SignoffRun';
import { ContactCards } from './ContactCards';
import { ContactForm } from './ContactForm';

function Head({ s, dark }: { s: Section; dark?: boolean }) {
  return (
    <div className="section-head">
      <h2 id={`${s.id}-title`}>{s.title}</h2>
      {s.subtitle && <p className={dark ? 'on-dark' : undefined}>{s.subtitle}</p>}
    </div>
  );
}

export function Hero({ content }: { content: Content }) {
  const { site, hero } = content;
  const contactVisible = isRendered('contact', content);
  return (
    <section id="top" className="hero-section" aria-labelledby="hero-title">
      <div className="wrap hero">
        <div className="hero-copy">
          {site.showAvailability && site.availability && (
            <p className="availability">
              <span className="dot" aria-hidden="true" />
              {site.availability}
            </p>
          )}
          {hero.greeting && <p className="hello">{hero.greeting}</p>}
          <h1 id="hero-title">{hero.headline}</h1>
          {hero.intro && <p className="intro">{hero.intro}</p>}
          <div className="actions">
            {site.resumeUrl && (
              <a className="btn primary" href={site.resumeUrl} target="_blank" rel="noopener noreferrer" data-testid="resume-link">
                {site.resumeLabel || 'Download resume'}
              </a>
            )}
            {contactVisible && (
              <a className="btn" href="#contact">
                Get in touch
              </a>
            )}
          </div>
          {hero.stats.length > 0 && (
            <dl className="stats">
              {hero.stats.map((s, i) => (
                <div key={i}>
                  <dt>{s.value}</dt>
                  <dd>{s.label}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <div className="portrait">
          {site.photoUrl ? (
            <Image src={site.photoUrl} alt={`Portrait of ${site.name}`} width={800} height={800} priority sizes="(max-width: 860px) 168px, 420px" />
          ) : (
            <span className="monogram" aria-hidden="true">
              {site.initials}
            </span>
          )}
          <p className="portrait-tag">
            <strong>{site.name}</strong>
            {site.role}
            {site.location ? `, ${site.location}` : ''}
          </p>
        </div>
      </div>
    </section>
  );
}

type Props = { s: Section; content: Content };

/** A project gets its own page once it has a case study written. */
export const hasCaseStudy = (p: Content['projects'][number]) => p.visible && p.caseStudy.trim().length > 0;

// The panel above is an illustration. This points to the real thing: the suites that test
// this site. It only shows once the repository address is set, so it never links nowhere.
function TestEvidence({ repoUrl }: { repoUrl: string }) {
  if (!repoUrl) return null;
  const repo = repoUrl.replace(/\/$/, '');
  const onGitHub = repo.startsWith('https://github.com/');
  return (
    <p className="evidence" data-testid="test-evidence">
      The panel is an illustration. The real checks are the Playwright suites that test this site on every push: functionality on desktop and mobile,
      accessibility (axe, WCAG 2.2 AA), SEO and admin security.{' '}
      {onGitHub && (
        <>
          <a href={`${repo}/actions`} target="_blank" rel="noopener noreferrer">
            See the latest runs
          </a>{' '}
          or{' '}
        </>
      )}
      <a href={onGitHub ? `${repo}/tree/main/tests` : repo} target="_blank" rel="noopener noreferrer">
        read the tests
      </a>
      .
    </p>
  );
}

function Signoff({ s, content }: Props) {
  return (
    <section id={s.id} className="run-section" aria-labelledby={`${s.id}-title`}>
      <div className="wrap">
        <Head s={s} />
        <SignoffRun signoff={content.signoff} />
        <TestEvidence repoUrl={content.site.repoUrl} />
      </div>
    </section>
  );
}

function Projects({ s, content }: Props) {
  const items = content.projects.filter((p) => p.visible);
  if (!items.length) return null;
  return (
    <section id={s.id} aria-labelledby={`${s.id}-title`}>
      <div className="wrap">
        <Head s={s} />
        <div className="projects">
          {items.map((p) => (
            <article className="project" key={p.id} data-testid="case-study">
              <div className="project-top">
                <span className="domain">{p.domain}</span>
                {p.status && <span className="badge">{p.status}</span>}
              </div>
              <h3>
                {p.link ? (
                  <a href={p.link} target="_blank" rel="noopener noreferrer">
                    {p.title}
                  </a>
                ) : (
                  p.title
                )}
              </h3>
              <p className="project-summary">{p.summary}</p>
              {p.role && <p className="project-role">My role: {p.role}</p>}
              {(p.employer || p.period) && <p className="project-meta">{[p.employer, p.period].filter(Boolean).join(', ')}</p>}
              {p.tested.length > 0 && (
                <div className="tested">
                  <h4>Testing scope</h4>
                  <ul>
                    {p.tested.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
              {hasCaseStudy(p) && (
                <Link className="more-link" href={`/projects/${p.id}`} aria-label={`Read the ${p.title} case study`}>
                  Read the case study
                </Link>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Ai({ s, content }: Props) {
  const { ai } = content;
  return (
    <section id={s.id} className="band" aria-labelledby={`${s.id}-title`}>
      <div className="wrap">
        <Head s={s} />
        {ai.intro && <p className="ai-intro">{ai.intro}</p>}
        {ai.steps.length > 0 && (
          <ol className="ai-steps">
            {ai.steps.map((step, i) => (
              <li key={i}>
                <span className="ai-num" aria-hidden="true">
                  {i + 1}
                </span>
                <h3>{step.title}</h3>
                {step.detail && <p>{step.detail}</p>}
              </li>
            ))}
          </ol>
        )}
        {ai.result && <p className="ai-result">{ai.result}</p>}
        {ai.samples.length > 0 && (
          <div className="ai-samples">
            <h3>Sample output</h3>
            {ai.samples.map((sample, i) => (
              <details key={i}>
                <summary>{sample.title}</summary>
                <pre tabIndex={0}>{sample.body}</pre>
              </details>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Impact({ s, content }: Props) {
  if (!content.impact.length) return null;
  return (
    <section id={s.id} className="band" aria-labelledby={`${s.id}-title`}>
      <div className="wrap">
        <Head s={s} />
        <dl className="impact">
          {content.impact.map((m, i) => (
            <div key={i}>
              <dt>{m.value}</dt>
              <dd className="label">{m.label}</dd>
              {m.source && <dd className="source">{m.source}</dd>}
              {m.note && <dd className="note">{m.note}</dd>}
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Experience({ s, content }: Props) {
  const jobs = content.experience.filter((j) => j.visible);
  if (!jobs.length) return null;
  return (
    <section id={s.id} aria-labelledby={`${s.id}-title`}>
      <div className="wrap">
        <Head s={s} />
        <ol className="timeline">
          {jobs.map((job) => (
            <li key={job.id} className={`job${job.current ? ' current' : ''}`}>
              <span className="node" aria-hidden="true" />
              <div className="job-head">
                <p className="period">{job.period}</p>
                {job.current && <span className="badge">Current role</span>}
              </div>
              <h3>{job.title}</h3>
              <p className="where">{[job.company, job.place].filter(Boolean).join(', ')}</p>
              {job.points.length > 0 && (
                <ul>
                  {job.points.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
        {content.earlier && <p className="earlier">{content.earlier}</p>}
      </div>
    </section>
  );
}

function Recognition({ s, content }: Props) {
  const items = content.recognition.filter((r) => r.visible);
  if (!items.length) return null;
  return (
    <section id={s.id} className="band" aria-labelledby={`${s.id}-title`}>
      <div className="wrap">
        <Head s={s} />
        <div className="recognition">
          {items.map((r) => (
            <article className="award" key={r.id}>
              {r.imageUrl && <img src={r.imageUrl} alt={`${r.title} from ${r.from}`} loading="lazy" />}
              <h3>{r.title}</h3>
              <p className="award-meta">{[r.from, r.date].filter(Boolean).join(', ')}</p>
              {r.quote && <blockquote>{r.quote}</blockquote>}
              {r.link && (
                <a className="more-link" href={r.link} target="_blank" rel="noopener noreferrer">
                  View original
                </a>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Toolkit({ s, content }: Props) {
  if (!content.toolkit.length && !content.practices.length && !content.artifacts.length) return null;
  return (
    <section id={s.id} aria-labelledby={`${s.id}-title`}>
      <div className="wrap">
        <Head s={s} />
        {content.toolkit.length > 0 && (
          <ul className="tools">
            {content.toolkit.map((t, i) => (
              <li key={i} className={`tool${t.tag ? ' flagged' : ''}`}>
                <span className="tool-name">{t.name}</span>
                <span className="tool-use">{t.use}</span>
                {t.tag && <span className="badge">{t.tag}</span>}
              </li>
            ))}
          </ul>
        )}
        {(content.practices.length > 0 || content.artifacts.length > 0) && (
          <div className="two-col">
            {content.practices.length > 0 && (
              <div>
                <h3>How I run QA</h3>
                <ul className="practices">
                  {content.practices.map((p, i) => (
                    <li key={i}>
                      {p.detail ? <strong>{p.title}</strong> : p.title}
                      {p.detail && <span>{p.detail}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {content.artifacts.length > 0 && (
              <div>
                <h3>Templates I use</h3>
                <ul className="practices">
                  {content.artifacts.map((a, i) => (
                    <li key={i}>
                      {a.url ? (
                        <a href={a.url} target="_blank" rel="noopener noreferrer">
                          {a.title}
                        </a>
                      ) : (
                        <strong>{a.title}</strong>
                      )}
                      {a.description && <span>{a.description}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Certifications({ s, content }: Props) {
  if (!content.certifications.length) return null;
  return (
    <section id={s.id} aria-labelledby={`${s.id}-title`}>
      <div className="wrap">
        <Head s={s} />
        <ul className="certs">
          {content.certifications.map((c) => (
            <li className="cert" key={c.id}>
              <strong>
                {c.link ? (
                  <a href={c.link} target="_blank" rel="noopener noreferrer">
                    {c.name}
                  </a>
                ) : (
                  c.name
                )}
              </strong>
              <span>{[c.issuer, c.year].filter(Boolean).join(', ')}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function Blog({ s, content }: Props) {
  const posts = content.posts.filter(isLive).sort((a, b) => b.date.localeCompare(a.date));
  if (!posts.length) return null;
  return (
    <section id={s.id} className="band" aria-labelledby={`${s.id}-title`}>
      <div className="wrap">
        <Head s={s} />
        <ul className="posts">
          {posts.slice(0, 3).map((p) => (
            <li className="post-row" key={p.slug}>
              <time dateTime={p.date}>{formatDate(p.date)}</time>
              <div>
                <h3>
                  <Link href={`/blog/${p.slug}`}>{p.title}</Link>
                </h3>
                {p.summary && <p>{p.summary}</p>}
              </div>
            </li>
          ))}
        </ul>
        {posts.length > 3 && (
          <Link className="more-link" href="/blog">
            All {posts.length} posts
          </Link>
        )}
      </div>
    </section>
  );
}

function Now({ s, content }: Props) {
  if (!content.now.length && !content.education.length) return null;
  return (
    <section id={s.id} aria-label={s.title || 'Current focus and education'}>
      <div className="wrap two-col now-grid">
        {content.now.length > 0 && (
          <div>
            <h2 className="mini-title">{s.title}</h2>
            <ul>
              {content.now.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        )}
        {content.education.length > 0 && (
          <div>
            <h2 className="mini-title">Education</h2>
            <ul>
              {content.education.map((e, i) => (
                <li key={i}>
                  {[e.degree, e.school].filter(Boolean).join(', ')}
                  {e.year ? ` (${e.year})` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function Contact({ s, content }: Props) {
  const { site } = content;
  const phoneEncoded = site.showPhone && site.phone ? Buffer.from(site.phone).toString('base64') : '';
  return (
    <section id={s.id} className="contact" aria-labelledby={`${s.id}-title`}>
      <div className={`wrap contact-grid${content.contact.formEnabled ? ' split' : ''}`}>
        <div className="contact-info">
          <Head s={s} dark />
          {(site.location || (site.showAvailability && site.availability)) && (
            <p className="contact-meta">
              {site.showAvailability && site.availability && (
                <span className="contact-open">
                  <span className="dot" aria-hidden="true" />
                  {site.availability}
                </span>
              )}
              {site.location && <span>Based in {site.location}</span>}
            </p>
          )}
          <ContactCards email={site.email} phoneEncoded={phoneEncoded} linkedin={site.linkedin} github={site.github} resumeUrl={site.resumeUrl} />
        </div>
        {content.contact.formEnabled && <ContactForm intro={content.contact.formIntro} />}
      </div>
    </section>
  );
}

const RENDERERS: Record<Section['id'], (p: Props) => React.ReactNode> = {
  signoff: Signoff,
  projects: Projects,
  ai: Ai,
  impact: Impact,
  experience: Experience,
  recognition: Recognition,
  toolkit: Toolkit,
  certifications: Certifications,
  blog: Blog,
  now: Now,
  contact: Contact,
};

export function PageSections({ content }: { content: Content }) {
  return (
    <>
      {renderedSections(content).map((s) => {
        const Render = RENDERERS[s.id];
        return <Render key={s.id} s={s} content={content} />;
      })}
    </>
  );
}
