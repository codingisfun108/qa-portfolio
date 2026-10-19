import Link from 'next/link';
import type { Content } from '@/lib/schema';
import { isRendered, renderedSections } from '@/lib/visibility';

export function SiteHeader({ content, onHome }: { content: Content; onHome: boolean }) {
  const { site } = content;
  // Only sections that actually render get a menu link, so no link points to nothing.
  const nav = renderedSections(content).filter((s) => s.inNav);
  const contactVisible = isRendered('contact', content);
  const href = (id: string) => (onHome ? `#${id}` : `/#${id}`);

  return (
    <header className="site-header">
      <div className="wrap">
        <Link className="brand" href={onHome ? '#top' : '/'}>
          <span className="brand-mark" aria-hidden="true">
            {site.initials}
          </span>
          {site.firstName}
        </Link>
        {nav.length > 0 && (
          <nav className="site-nav" aria-label="Sections">
            {nav.map((s) =>
              s.id === 'blog' ? (
                <Link key={s.id} href="/blog">
                  {s.navLabel}
                </Link>
              ) : (
                <a key={s.id} href={href(s.id)}>
                  {s.navLabel}
                </a>
              ),
            )}
          </nav>
        )}
        {contactVisible && (
          <a className="btn primary small" href={href('contact')}>
            Hire me
          </a>
        )}
      </div>
    </header>
  );
}

export function SiteFooter({ content }: { content: Content }) {
  const { site } = content;
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="wrap">
        <span>
          {site.location ? `${site.location}. ` : ''}© {year} {site.name}
        </span>
        <span className="footer-links">
          <span>This site is tested with Playwright on every push.</span>
          {site.repoUrl && (
            <a href={site.repoUrl} target="_blank" rel="noopener noreferrer">
              See the tests
            </a>
          )}
        </span>
      </div>
    </footer>
  );
}

export function PersonJsonLd({ content }: { content: Content }) {
  const { site } = content;
  const sameAs = [site.linkedin, site.github].filter((u) => u.startsWith('http'));
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.name,
    jobTitle: site.role,
    ...(site.location ? { address: { '@type': 'PostalAddress', addressLocality: site.location } } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(site.email ? { email: `mailto:${site.email}` } : {}),
    knowsAbout: content.toolkit.map((t) => t.name),
  };
  return (
    <script
      type="application/ld+json"
      // JSON-LD must be a raw script body; "<" is escaped so content can't close the tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
