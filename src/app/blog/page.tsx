import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getContent } from '@/lib/store';
import { formatDate } from '@/components/Sections';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { sections, site } = await getContent();
  const blog = sections.find((s) => s.id === 'blog');
  return { title: blog?.title || 'Writing', description: blog?.subtitle || site.seoDescription, alternates: { canonical: '/blog' } };
}

export default async function BlogIndex() {
  const content = await getContent();
  const section = content.sections.find((s) => s.id === 'blog');
  const posts = content.posts.filter((p) => p.published).sort((a, b) => b.date.localeCompare(a.date));
  if (!section?.visible || !posts.length) notFound();

  return (
    <>
      <SiteHeader content={content} onHome={false} />
      <main id="main" className="page-plain">
        <section aria-labelledby="blog-title">
          <div className="wrap">
            <div className="section-head">
              <h1 id="blog-title" className="mini-title" style={{ fontSize: 'var(--step-2)' }}>
                {section.title}
              </h1>
              {section.subtitle && <p>{section.subtitle}</p>}
            </div>
            <ul className="posts">
              {posts.map((p) => (
                <li className="post-row" key={p.slug}>
                  <time dateTime={p.date}>{formatDate(p.date)}</time>
                  <div>
                    <h2 className="mini-title" style={{ marginBottom: 0 }}>
                      <Link href={`/blog/${p.slug}`}>{p.title}</Link>
                    </h2>
                    {p.summary && <p>{p.summary}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter content={content} />
    </>
  );
}
