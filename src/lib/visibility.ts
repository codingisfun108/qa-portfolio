import type { Content, Section } from './schema';

// One rule for "does this section have anything to show?". The page, the top menu, the
// "Hire me" / "Get in touch" buttons and the admin badges all use it, so a section that is
// switched on but empty never renders as a blank band or a menu link to nowhere.

type Post = Content['posts'][number];

// Post dates are calendar days in the author's time zone, so a post dated tomorrow goes
// live at midnight there, not at midnight UTC.
const SITE_TIME_ZONE = 'Asia/Kolkata';
export const todayOnSite = () => new Intl.DateTimeFormat('en-CA', { timeZone: SITE_TIME_ZONE }).format(new Date());

/** Published with a future date: saved and ready, but not shown until that day. */
export const isScheduled = (p: Post) => p.published && p.date > todayOnSite();

/** The one rule for "can visitors see this post?". Pages refresh hourly, which is what
 *  makes a scheduled post appear on its date without anyone pressing a button. */
export const isLive = (p: Post) => p.published && !isScheduled(p);

export function hasContactMethod(c: Content): boolean {
  const s = c.site;
  return Boolean(s.email || (s.showPhone && s.phone) || s.linkedin || s.github || s.resumeUrl || c.contact.formEnabled);
}

export function sectionHasContent(id: Section['id'], c: Content): boolean {
  switch (id) {
    case 'signoff':
      return c.signoff.checks.length > 0;
    case 'projects':
      return c.projects.some((p) => p.visible);
    case 'ai':
      return Boolean(c.ai.intro) || c.ai.steps.length > 0 || c.ai.samples.length > 0;
    case 'impact':
      return c.impact.length > 0;
    case 'experience':
      return c.experience.some((j) => j.visible);
    case 'recognition':
      return c.recognition.some((r) => r.visible);
    case 'toolkit':
      return c.toolkit.length > 0 || c.practices.length > 0 || c.artifacts.length > 0;
    case 'certifications':
      return c.certifications.length > 0;
    case 'blog':
      return c.posts.some(isLive);
    case 'now':
      return c.now.length > 0 || c.education.length > 0;
    case 'contact':
      return hasContactMethod(c);
  }
}

/** Sections that will actually appear on the homepage, in order. */
export function renderedSections(c: Content): Section[] {
  return c.sections.filter((s) => s.visible && sectionHasContent(s.id, c));
}

export function isRendered(id: Section['id'], c: Content): boolean {
  return renderedSections(c).some((s) => s.id === id);
}

/** Why a section won't show, in words for the admin panel. Null when it shows. */
export function hiddenReason(s: Section, c: Content): string | null {
  if (!s.visible) return 'Off';
  if (!sectionHasContent(s.id, c)) return 'Empty, so hidden';
  return null;
}
