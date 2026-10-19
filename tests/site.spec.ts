import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { seed } from '../src/content/seed';

// These run against the starting content (src/content/seed.ts), so they double as a check
// that every section renders from data.

const visible = (id: string) => seed.sections.find((s) => s.id === id)?.visible;

test.describe('Homepage', () => {
  test('loads with title, headline and no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await expect(page).toHaveTitle(new RegExp(seed.site.name));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(seed.hero.headline);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('release sign-off panel runs every check to Passed', async ({ page }) => {
    await page.goto('/');
    const panel = page.getByTestId('signoff');
    const total = seed.signoff.checks.length;
    await panel.scrollIntoViewIfNeeded();
    await expect(panel.locator('[data-count]')).toHaveText(`${total}/${total}`, { timeout: 10_000 });
    await expect(panel.locator('.term-line.is-pass')).toHaveCount(total);
    await expect(panel.locator('[data-status]')).toHaveText('Passed');
  });

  test('shows only visible projects and jobs', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('case-study')).toHaveCount(seed.projects.filter((p) => p.visible).length);
    await expect(page.locator('.timeline > li')).toHaveCount(seed.experience.filter((j) => j.visible).length);
    await expect(page.locator('.job.current')).toContainText(seed.experience.find((j) => j.current)!.company);
  });

  test('hidden sections stay hidden', async ({ page }) => {
    await page.goto('/');
    for (const s of seed.sections.filter((x) => !x.visible)) {
      await expect(page.locator(`section#${s.id}`)).toHaveCount(0);
    }
  });

  test('impact figures render with their sources', async ({ page }) => {
    test.skip(!visible('impact'));
    await page.goto('/');
    for (const m of seed.impact) await expect(page.locator('#impact')).toContainText(m.label);
  });
});

test.describe('Navigation and links', () => {
  test('menu links scroll to their sections', async ({ page, isMobile }) => {
    test.skip(isMobile, 'The section menu is hidden on small screens');
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Sections' });
    for (const s of seed.sections.filter((x) => x.visible && x.inNav && x.id !== 'blog')) {
      await nav.getByRole('link', { name: s.navLabel }).click();
      await expect(page.locator(`#${s.id}`)).toBeInViewport();
    }
  });

  test('"Hire me" jumps to contact', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Hire me' }).click();
    await expect(page.locator('#contact')).toBeInViewport();
  });

  test('external links open safely in a new tab', async ({ page }) => {
    await page.goto('/');
    const links = page.locator('a[href^="http"]');
    const n = await links.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      await expect(links.nth(i)).toHaveAttribute('target', '_blank');
      await expect(links.nth(i)).toHaveAttribute('rel', /noopener/);
    }
  });

  test('resume PDF is served', async ({ page, request }) => {
    await page.goto('/');
    const href = await page.getByTestId('resume-link').getAttribute('href');
    const res = await request.get(href!);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('pdf');
  });
});

test.describe('Contact', () => {
  test('email card has a working mailto link', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('email')).toHaveText(seed.site.email);
    await expect(page.getByRole('link', { name: 'Send email' })).toHaveAttribute('href', `mailto:${seed.site.email}`);
  });

  test('phone number stays out of the HTML until requested', async ({ page }) => {
    await page.goto('/');
    const digits = seed.site.phone.replace(/\D/g, '');
    expect((await page.content()).replace(/\D/g, '')).not.toContain(digits);
    const card = page.getByTestId('phone-card');
    await expect(card.getByRole('link', { name: 'Call now' })).toHaveCount(0);
    await card.getByRole('button', { name: 'Show number' }).click();
    await expect(card).toContainText(seed.site.phone);
    await expect(card.getByRole('link', { name: 'Call now' })).toHaveAttribute('href', /^tel:\+?\d+$/);
  });

  test('contact form validates, then sends', async ({ page }, info) => {
    await page.goto('/#contact');
    const form = page.locator('form.contact-form');
    await expect(form.getByRole('button', { name: 'Send message' })).toBeEnabled();
    await form.getByRole('button', { name: 'Send message' }).click();
    // Browser validation blocks an empty form, so nothing is sent.
    await expect(form.getByRole('status')).toHaveText('');

    await form.getByLabel('Your name').fill(`Playwright ${info.project.name}`);
    await form.getByLabel('Your email').fill('recruiter@example.com');
    await form.getByLabel('Company (optional)').fill('Example Corp');
    await form.getByLabel('Message').fill('We would like to talk about a QA Lead role.');
    await form.getByRole('button', { name: 'Send message' }).click();
    await expect(form.getByRole('status')).toHaveText("Message sent. I'll reply by email.");
  });

  test('contact API rejects bad input with a clear message', async ({ request, baseURL }) => {
    const res = await request.post('/api/contact', {
      data: { name: 'A', email: 'not-an-email', message: 'Hello there, long enough' },
      headers: { origin: baseURL! },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('Enter a valid email address');
  });

  test('contact API silently drops honeypot submissions', async ({ request, baseURL }) => {
    const res = await request.post('/api/contact', {
      data: { name: 'Bot', email: 'bot@example.com', message: 'Buy cheap backlinks today', website: 'http://spam.example' },
      headers: { origin: baseURL! },
    });
    expect(res.status()).toBe(200);
  });
});

test.describe('Forms never leak data into the URL', () => {
  test('contact and login forms post, and stay disabled until the page is ready', async ({ page, browser }) => {
    for (const [path, form] of [['/', 'form.contact-form'], ['/admin/login', 'form.adm-form']] as const) {
      await page.goto(path);
      await expect(page.locator(form)).toHaveAttribute('method', 'post');
    }
    // With JavaScript off, the buttons stay disabled, so nothing can be submitted the unsafe way.
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const raw = await ctx.newPage();
    await raw.goto('/admin/login');
    await expect(raw.getByRole('button', { name: 'Sign in' })).toBeDisabled();
    await raw.goto('/');
    await expect(raw.getByRole('button', { name: 'Send message' })).toBeDisabled();
    await ctx.close();
  });
});

test.describe('Quality gates', () => {
  test('no serious or critical accessibility violations (WCAG 2.2 AA)', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    const blocking = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
    expect(blocking.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
  });

  test('no horizontal scroll', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('one h1 and every image has alt text', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('img:not([alt])')).toHaveCount(0);
  });
});

test.describe('SEO', () => {
  test('meta description, Open Graph and JSON-LD are present', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', seed.site.seoDescription);
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}');
    expect(ld['@type']).toBe('Person');
    expect(ld.name).toBe(seed.site.name);
  });

  test('sitemap, robots and preview image are served', async ({ request }) => {
    expect((await request.get('/sitemap.xml')).status()).toBe(200);
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('Disallow: /admin');
    const og = await request.get('/opengraph-image');
    expect(og.status()).toBe(200);
    expect(og.headers()['content-type']).toContain('image/png');
  });

  test('unknown pages and unpublished posts return 404', async ({ page }) => {
    expect((await page.goto('/does-not-exist'))?.status()).toBe(404);
    const draft = seed.posts.find((p) => !p.published);
    if (draft) expect((await page.goto(`/blog/${draft.slug}`))?.status()).toBe(404);
  });
});
