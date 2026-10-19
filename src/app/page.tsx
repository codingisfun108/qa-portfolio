import { getContent } from '@/lib/store';
import { Hero, PageSections } from '@/components/Sections';
import { PersonJsonLd, SiteFooter, SiteHeader } from '@/components/SiteChrome';

// Static and fast; saving in the admin panel refreshes it immediately.
export const revalidate = 3600;

export default async function Home() {
  const content = await getContent();
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <SiteHeader content={content} onHome />
      <main id="main">
        <Hero content={content} />
        <PageSections content={content} />
      </main>
      <SiteFooter content={content} />
      <PersonJsonLd content={content} />
    </>
  );
}
