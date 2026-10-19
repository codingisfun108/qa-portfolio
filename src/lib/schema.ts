import { z } from 'zod';

// Every piece of text, list and toggle shown on the public site lives in this one document.
// The admin panel edits it; the site renders it. Change the shape here first.

const text = (max = 500) => z.string().trim().max(max);
const url = z.union([z.literal(''), z.string().trim().max(1000).regex(/^(https?:\/\/|\/)/, 'Must start with https:// or /')]);
const id = z.string().trim().min(1).max(64);
// Blank entries (from empty lines in the admin textareas) are dropped on save.
const lines = (max = 300) =>
  z
    .array(text(max))
    .max(60)
    .transform((a) => a.filter((s) => s.length > 0));

export const SECTION_IDS = [
  'signoff',
  'projects',
  'impact',
  'experience',
  'recognition',
  'toolkit',
  'certifications',
  'blog',
  'now',
  'contact',
] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export const SECTION_LABELS: Record<SectionId, string> = {
  signoff: 'Release sign-off panel',
  projects: 'Projects',
  impact: 'Impact numbers',
  experience: 'Experience',
  recognition: 'Recognition',
  toolkit: 'Toolkit',
  certifications: 'Certifications',
  blog: 'Writing',
  now: 'Now and education',
  contact: 'Contact',
};

const section = z.object({
  id: z.enum(SECTION_IDS),
  visible: z.boolean(),
  inNav: z.boolean(),
  navLabel: text(40),
  title: text(120),
  subtitle: text(400),
});

export const contentSchema = z.object({
  version: z.literal(1),
  updatedAt: z.string().max(40),

  site: z.object({
    name: text(80).min(1),
    firstName: text(40).min(1),
    initials: text(4).min(1),
    role: text(80).min(1),
    location: text(80),
    availability: text(80),
    showAvailability: z.boolean(),
    email: z.union([z.literal(''), z.email()]),
    phone: text(30),
    showPhone: z.boolean(),
    linkedin: url,
    github: url,
    photoUrl: url,
    resumeUrl: url,
    resumeLabel: text(60),
    repoUrl: url,
    seoTitle: text(80),
    seoDescription: text(200),
    siteUrl: url,
  }),

  hero: z.object({
    greeting: text(120),
    headline: text(140).min(1),
    intro: text(800),
    stats: z.array(z.object({ value: text(12), label: text(40) })).max(4),
  }),

  signoff: z.object({
    fileName: text(60),
    command: text(80),
    checks: z.array(z.object({ gate: text(60), detail: text(60) })).max(12),
    resultText: text(120),
  }),

  sections: z.array(section).length(SECTION_IDS.length),

  projects: z
    .array(
      z.object({
        id,
        visible: z.boolean(),
        title: text(80).min(1),
        domain: text(60),
        status: text(30),
        summary: text(400),
        role: text(80),
        tested: lines(160),
        link: url,
      }),
    )
    .max(20),

  impact: z.array(z.object({ value: text(12), label: text(80), source: text(80) })).max(12),

  experience: z
    .array(
      z.object({
        id,
        visible: z.boolean(),
        title: text(80).min(1),
        company: text(80),
        place: text(60),
        period: text(60),
        current: z.boolean(),
        points: lines(300),
      }),
    )
    .max(20),
  earlier: text(600),

  recognition: z
    .array(
      z.object({
        id,
        visible: z.boolean(),
        title: text(100).min(1),
        from: text(100),
        date: text(40),
        quote: text(600),
        imageUrl: url,
        link: url,
      }),
    )
    .max(20),

  toolkit: z.array(z.object({ name: text(60).min(1), use: text(120), tag: text(30) })).max(30),
  practices: lines(60),

  certifications: z
    .array(z.object({ id, name: text(120).min(1), issuer: text(80), year: text(10), link: url }))
    .max(20),

  posts: z
    .array(
      z.object({
        slug: z
          .string()
          .trim()
          .min(1)
          .max(80)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes'),
        published: z.boolean(),
        title: text(140).min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
        summary: text(300),
        tags: lines(30),
        body: z.string().max(40_000),
      }),
    )
    .max(100),

  now: lines(200),
  education: z.array(z.object({ degree: text(120), school: text(120), year: text(10) })).max(6),

  contact: z.object({
    formEnabled: z.boolean(),
    formIntro: text(200),
  }),
});

export type Content = z.infer<typeof contentSchema>;
export type Section = Content['sections'][number];

export const messageSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(100),
  email: z.email('Enter a valid email address').max(200),
  company: z.string().trim().max(120).optional().default(''),
  message: z.string().trim().min(10, 'Message needs at least 10 characters').max(4000),
  // Honeypot: real people never see or fill this field.
  website: z.string().max(0).optional().default(''),
});

export type Message = Omit<z.infer<typeof messageSchema>, 'website'> & { id: string; receivedAt: string; read: boolean };

/** Fills sections a stored document may be missing (e.g. after a new section type ships). */
export function normalizeSections(sections: Section[], fallback: Section[]): Section[] {
  const byId = new Map(sections.map((s) => [s.id, s]));
  const ordered = sections.filter((s) => SECTION_IDS.includes(s.id));
  for (const f of fallback) if (!byId.has(f.id)) ordered.push(f);
  return ordered;
}
