import type { MetadataRoute } from 'next';
import { getContent } from '@/lib/store';
import { hasCaseStudy } from '@/components/Sections';
import { isLive, isRendered } from '@/lib/visibility';

export const revalidate = 3600;

function base(siteUrl: string) {
  if (siteUrl) return siteUrl.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return 'http://localhost:3000';
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const content = await getContent();
  const root = base(content.site.siteUrl);
  const blogVisible = content.sections.some((s) => s.id === 'blog' && s.visible);
  const posts = blogVisible ? content.posts.filter(isLive) : [];
  const studies = isRendered('projects', content) ? content.projects.filter(hasCaseStudy) : [];
  return [
    { url: `${root}/`, lastModified: content.updatedAt, changeFrequency: 'monthly', priority: 1 },
    ...(posts.length ? [{ url: `${root}/blog`, changeFrequency: 'weekly' as const, priority: 0.7 }] : []),
    ...posts.map((p) => ({ url: `${root}/blog/${p.slug}`, lastModified: p.date, priority: 0.6 })),
    ...studies.map((p) => ({ url: `${root}/projects/${p.id}`, lastModified: content.updatedAt, priority: 0.8 })),
  ];
}
