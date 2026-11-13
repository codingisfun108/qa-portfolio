import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getContent } from '@/lib/store';
import { renderMarkdown } from '@/lib/markdown';
import { hasCaseStudy } from '@/components/Sections';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { isRendered } from '@/lib/visibility';

export const revalidate = 3600;

type Params = { params: Promise<{ id: string }> };

// A case study exists only for a visible project, in a visible Projects section, that has
// one written. Anything else is a 404, the same rule the homepage card link follows.
async function findProject(id: string) {
  const content = await getContent();
  const project = isRendered('projects', content) ? content.projects.find((p) => p.id === id && hasCaseStudy(p)) : undefined;
  return { content, project };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { project } = await findProject((await params).id);
  if (!project) return { title: 'Not found' };
  const title = `${project.title} case study`;
  return {
    title,
    description: project.summary,
    alternates: { canonical: `/projects/${project.id}` },
    openGraph: { type: 'article', title, description: project.summary },
  };
}

export default async function CaseStudyPage({ params }: Params) {
  const { project, content } = await findProject((await params).id);
  if (!project) notFound();
  const facts = [project.role, project.employer, project.period].filter(Boolean);

  return (
    <>
      <SiteHeader content={content} onHome={false} />
      <main id="main">
        <article className="wrap article" data-testid="case-study-page">
          <p className="article-meta">
            <a href="/#projects">Projects</a>
            {project.domain ? ` · ${project.domain}` : ''}
          </p>
          <h1>{project.title}</h1>
          {project.summary && <p className="project-summary">{project.summary}</p>}
          {facts.length > 0 && (
            <ul className="tags" aria-label="Role, employer and dates">
              {facts.map((f) => (
                <li key={f} className="badge">
                  {f}
                </li>
              ))}
            </ul>
          )}
          <div className="prose" style={{ marginTop: 32 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(project.caseStudy) }} />
        </article>
      </main>
      <SiteFooter content={content} />
    </>
  );
}
