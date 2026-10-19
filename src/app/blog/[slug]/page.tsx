import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getContent } from '@/lib/store';
import { renderMarkdown } from '@/lib/markdown';
import { formatDate } from '@/components/Sections';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';

export const revalidate = 3600;

type Params = { params: Promise<{ slug: string }> };

async function findPost(slug: string) {
  const content = await getContent();
  const blogVisible = content.sections.some((s) => s.id === 'blog' && s.visible);
  const post = content.posts.find((p) => p.slug === slug && p.published);
  return { content, post: blogVisible ? post : undefined };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { post, content } = await findPost((await params).slug);
  if (!post) return { title: 'Not found' };
  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: 'article', title: post.title, description: post.summary, publishedTime: post.date, authors: [content.site.name] },
  };
}

export default async function PostPage({ params }: Params) {
  const { post, content } = await findPost((await params).slug);
  if (!post) notFound();

  return (
    <>
      <SiteHeader content={content} onHome={false} />
      <main id="main">
        <article className="wrap article">
          <p className="article-meta">
            <Link href="/blog">Writing</Link> · <time dateTime={post.date}>{formatDate(post.date)}</time>
          </p>
          <h1>{post.title}</h1>
          {post.tags.length > 0 && (
            <ul className="tags" aria-label="Tags">
              {post.tags.map((t) => (
                <li key={t} className="badge">
                  {t}
                </li>
              ))}
            </ul>
          )}
          <div className="prose" style={{ marginTop: 32 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }} />
        </article>
      </main>
      <SiteFooter content={content} />
    </>
  );
}
