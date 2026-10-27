import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { TEST_ADMIN } from '../playwright.config';
import { seed } from '../src/content/seed';

test.describe.configure({ mode: 'serial' });

async function signIn(page: Page) {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  await page.getByLabel('Email').fill(TEST_ADMIN.email);
  await page.getByLabel('Password').fill(TEST_ADMIN.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await waitReady(page);
}

/** The admin panel is server-rendered first; wait until its buttons are wired up. */
async function waitReady(page: Page) {
  await expect(page.locator('.adm-shell[data-ready="true"]')).toBeVisible();
}

async function saveAndWait(page: Page) {
  await page.getByRole('button', { name: 'Save and publish' }).click();
  await expect(page.getByText('Saved. The live site is updated.')).toBeVisible();
}

async function openTab(page: Page, name: string) {
  await page.getByRole('navigation', { name: 'Admin sections' }).getByRole('button', { name }).click();
}

async function resetContent(page: Page) {
  await openTab(page, 'Backup and security');
  await page.getByRole('button', { name: 'Reset to starting content' }).click();
  await page.getByRole('button', { name: 'Yes, reset everything' }).click();
  await expect(page.getByText('Starting content restored.')).toBeVisible();
}

test.describe('Access control', () => {
  test('admin pages redirect to sign-in when signed out', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('admin APIs return 401 without a session', async ({ request }) => {
    expect((await request.get('/api/admin/content')).status()).toBe(401);
    expect((await request.put('/api/admin/content', { data: {} })).status()).toBe(401);
    expect((await request.get('/api/admin/messages')).status()).toBe(401);
  });

  test('a forged session cookie is rejected', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'qa_admin_session', value: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.bad', url: baseURL! }]);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('wrong password shows an error and no session', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    await page.getByLabel('Email').fill(TEST_ADMIN.email);
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('form').getByRole('alert')).toHaveText('Email or password is incorrect.');
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('sign-in from another site is blocked', async ({ request }) => {
    const res = await request.post('/api/admin/login', {
      data: { email: TEST_ADMIN.email, password: TEST_ADMIN.password },
      headers: { origin: 'https://evil.example' },
    });
    expect(res.status()).toBe(403);
  });

  test('session cookie is httpOnly', async ({ page, context }) => {
    await signIn(page);
    const cookie = (await context.cookies()).find((c) => c.name === 'qa_admin_session');
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('Lax');
  });
});

test.describe('Editing content', () => {
  test.beforeEach(async ({ page }) => signIn(page));

  test('changing the headline updates the live site', async ({ page }) => {
    const headline = `Release quality you can measure ${Date.now()}`;
    await openTab(page, 'Hero');
    await page.getByLabel('Headline').fill(headline);
    await expect(page.getByText('Unsaved changes')).toBeVisible();
    await saveAndWait(page);

    const site = await page.context().newPage();
    await site.goto('/');
    await expect(site.getByRole('heading', { level: 1 })).toHaveText(headline);
    await site.close();
    await resetContent(page);
  });

  test('turning a section off hides it on the site', async ({ page }) => {
    await openTab(page, 'Sections and order');
    await page.locator('.adm-main').getByRole('button', { name: /^Impact numbers/ }).click();
    await page.getByLabel('Show section').uncheck();
    await saveAndWait(page);

    const site = await page.context().newPage();
    await site.goto('/');
    await expect(site.locator('section#impact')).toHaveCount(0);
    await expect(site.locator('section#projects')).toHaveCount(1);
    await site.close();
    await resetContent(page);
  });

  test('adding a project shows a new card', async ({ page }) => {
    await openTab(page, 'Projects');
    await page.getByRole('button', { name: '+ Add project' }).click();
    await page.getByLabel('Title').last().fill('Playwright framework demo');
    await page.getByLabel('Summary').last().fill('Public Playwright framework with API and UI layers.');
    await saveAndWait(page);

    const site = await page.context().newPage();
    await site.goto('/');
    await expect(site.getByTestId('case-study')).toHaveCount(seed.projects.filter((p) => p.visible).length + 1);
    await expect(site.getByRole('heading', { name: 'Playwright framework demo' })).toBeVisible();
    await site.close();
    await resetContent(page);
  });

  test('publishing a post makes it reachable', async ({ page }) => {
    const draft = seed.posts[0];
    await openTab(page, 'Writing');
    await page.locator('.adm-main').getByRole('button', { name: new RegExp(draft.title) }).click();
    await page.getByLabel('Published').check();
    await openTab(page, 'Sections and order');
    await page.locator('.adm-main').getByRole('button', { name: /^Writing/ }).click();
    await page.getByLabel('Show section').check();
    await saveAndWait(page);

    const site = await page.context().newPage();
    const res = await site.goto(`/blog/${draft.slug}`);
    expect(res?.status()).toBe(200);
    await expect(site.getByRole('heading', { level: 1 })).toHaveText(draft.title);
    await site.goto('/');
    await expect(site.locator('section#blog')).toContainText(draft.title);
    await site.close();
    await resetContent(page);
  });

  test('invalid content is refused with a field-level message', async ({ page }) => {
    await openTab(page, 'Profile and contact');
    await page.getByLabel('LinkedIn URL').fill('linkedin.com/in/no-scheme');
    await page.getByRole('button', { name: 'Save and publish' }).click();
    const alert = page.locator('.adm-main').getByRole('alert');
    await expect(alert).toContainText('Some fields need fixing');
    await expect(alert).toContainText('site.linkedin');
    await page.getByRole('button', { name: 'Discard' }).click();
    await expect(page.getByText('All changes saved')).toBeVisible();
  });

  test('messages from the contact form arrive in the inbox', async ({ page, request }) => {
    // Send its own message so this test doesn't depend on any other test.
    const sender = `Inbox check ${Date.now()}`;
    const sent = await request.post('/api/contact', {
      data: { name: sender, email: 'recruiter@example.com', company: '', message: 'We would like to talk about a QA Lead role.' },
    });
    expect(sent.status()).toBe(200);
    await page.reload();
    await waitReady(page);
    await openTab(page, 'Inbox');
    const message = page.getByTestId('inbox-message').filter({ hasText: sender });
    await expect(message).toContainText('We would like to talk about a QA Lead role.');
    await message.getByRole('button', { name: 'Mark as read' }).click();
    await expect(message.getByRole('button', { name: 'Mark as unread' })).toBeVisible();
    await message.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByTestId('inbox-message').filter({ hasText: sender })).toHaveCount(0);
  });

  test('signing out ends the session', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});

test.describe('Adding and editing anything', () => {
  test.beforeEach(async ({ page }) => signIn(page));

  test('a new job added in Experience appears on the timeline with its bullets', async ({ page }) => {
    await openTab(page, 'Experience');
    await page.getByRole('button', { name: '+ Add job' }).click();
    const job = page.locator('.adm-item.open');
    await job.getByLabel('Job title').fill('Senior QA Lead');
    await job.getByLabel('Company').fill('Next Company');
    await job.getByLabel('Location').fill('Bengaluru');
    await job.getByLabel('Dates').fill('Jan 2027 – Present');
    await job.getByLabel('Achievements').fill('Built the QA practice from scratch\nCut release time by 30%');
    // New items go to the bottom; move it to the top so it reads as the latest job.
    for (let i = 0; i < seed.experience.length; i++) await job.getByRole('button', { name: 'Move up' }).click();
    await expect(job.getByRole('button', { name: 'Move up' })).toBeDisabled();
    await saveAndWait(page);

    const site = await page.context().newPage();
    await site.goto('/');
    const first = site.locator('.timeline > li').first();
    await expect(first.getByRole('heading', { name: 'Senior QA Lead' })).toBeVisible();
    await expect(first).toContainText('Next Company, Bengaluru');
    await expect(first.locator('ul li')).toHaveCount(2);
    await site.close();
    await resetContent(page);
  });

  test('profile, hero and contact fields all edit the live site', async ({ page }) => {
    await openTab(page, 'Profile and contact');
    await page.getByLabel('Role', { exact: true }).fill('Head of QA');
    await page.getByLabel('Availability badge', { exact: true }).fill('Open to Head of QA roles');
    await page.getByLabel('Email', { exact: true }).fill('new.address@example.com');
    await openTab(page, 'Hero');
    await page.getByLabel('Greeting', { exact: true }).fill('Hello, I am Rahul.');
    await openTab(page, 'Sections and order');
    await page.locator('.adm-main').getByRole('button', { name: /^Experience/ }).click();
    await page.getByLabel('Heading').fill('Where I have worked');
    await saveAndWait(page);

    const site = await page.context().newPage();
    await site.goto('/');
    await expect(site.locator('.availability')).toHaveText('Open to Head of QA roles');
    await expect(site.locator('.hello')).toHaveText('Hello, I am Rahul.');
    await expect(site.locator('.portrait-tag')).toContainText('Head of QA');
    await expect(site.getByTestId('email')).toHaveText('new.address@example.com');
    await expect(site.getByRole('heading', { name: 'Where I have worked' })).toBeVisible();
    await site.close();
    await resetContent(page);
  });
});

test.describe('Empty and switched-off content', () => {
  test.beforeEach(async ({ page }) => signIn(page));

  /** Every in-page link must point at something that exists. */
  async function expectNoDeadAnchors(site: Page) {
    const hrefs = await site.locator('a[href^="#"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')!));
    for (const h of hrefs) await expect(site.locator(h === '#' ? 'body' : h), `link ${h}`).toHaveCount(1);
  }

  test('sections switched on but empty never show as blank bands or dead menu links', async ({ page }) => {
    const c = structuredClone(seed);
    c.projects = c.projects.map((p) => ({ ...p, visible: false }));
    c.experience = c.experience.map((j) => ({ ...j, visible: false }));
    c.signoff.checks = [];
    c.impact = [];
    c.toolkit = [];
    c.practices = [];
    c.now = [];
    c.education = [];
    c.hero.stats = [];
    c.site = { ...c.site, email: '', phone: '', linkedin: '', github: '', resumeUrl: '', photoUrl: '' };
    c.contact.formEnabled = false;
    c.sections = c.sections.map((s) => ({ ...s, visible: true, inNav: true }));
    const res = await page.request.put('/api/admin/content', { data: c });
    expect(res.status()).toBe(200);

    const site = await page.context().newPage();
    const errors: string[] = [];
    site.on('pageerror', (e) => errors.push(e.message));
    await site.goto('/');
    await expect(site.getByRole('heading', { level: 1 })).toHaveText(seed.hero.headline);
    for (const id of ['signoff', 'projects', 'impact', 'experience', 'recognition', 'toolkit', 'certifications', 'blog', 'now', 'contact']) {
      await expect(site.locator(`section#${id}`), id).toHaveCount(0);
    }
    await expect(site.getByRole('navigation', { name: 'Sections' })).toHaveCount(0);
    await expect(site.getByRole('link', { name: 'Hire me' })).toHaveCount(0);
    await expect(site.getByRole('link', { name: 'Get in touch' })).toHaveCount(0);
    await expect(site.getByTestId('resume-link')).toHaveCount(0);
    await expect(site.locator('.stats')).toHaveCount(0);
    await expect(site.locator('.monogram')).toHaveText(seed.site.initials); // initials stand in for a missing photo
    await expectNoDeadAnchors(site);
    expect(errors).toEqual([]);
    expect((await site.request.get('/opengraph-image')).status()).toBe(200);
    await site.close();

    // The admin panel says why each section isn't showing.
    await openTab(page, 'Sections and order');
    await page.reload();
    await waitReady(page);
    await openTab(page, 'Sections and order');
    await expect(page.locator('.adm-item').filter({ hasText: 'Projects' }).locator('.adm-pill')).toHaveText('Empty, so hidden');
    await resetContent(page);
  });

  test('every section switched off leaves a clean hero-only page', async ({ page }) => {
    const c = structuredClone(seed);
    c.sections = c.sections.map((s) => ({ ...s, visible: false }));
    expect((await page.request.put('/api/admin/content', { data: c })).status()).toBe(200);

    const site = await page.context().newPage();
    await site.goto('/');
    await expect(site.locator('main > section')).toHaveCount(1);
    await expect(site.locator('main > section#top')).toBeVisible();
    await expect(site.locator('footer')).toBeVisible();
    await expect(site.getByRole('navigation', { name: 'Sections' })).toHaveCount(0);
    await expectNoDeadAnchors(site);
    expect((await site.goto('/blog'))?.status()).toBe(404);
    await site.close();
    await resetContent(page);
  });

  test('hiding the only items in a list hides the section and its menu link', async ({ page }) => {
    await openTab(page, 'Projects');
    for (const p of seed.projects.filter((x) => x.visible)) {
      await page.locator('.adm-main').getByRole('button', { name: new RegExp(`^${p.title}`) }).click();
      await page.locator('.adm-item.open').getByLabel('Show on site').uncheck();
    }
    await saveAndWait(page);

    const site = await page.context().newPage();
    await site.goto('/');
    await expect(site.locator('section#projects')).toHaveCount(0);
    await expect(site.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Projects' })).toHaveCount(0);
    await expectNoDeadAnchors(site);
    await site.close();
    await resetContent(page);
  });
});

test.describe('Forgot password', () => {
  // Without RESEND_API_KEY the test server saves emails to .data-test/outbox instead of sending them.
  const outbox = path.join('.data-test', 'outbox');
  const emails = () => (fs.existsSync(outbox) ? fs.readdirSync(outbox).sort() : []);
  const latestCode = () => {
    const mail = JSON.parse(fs.readFileSync(path.join(outbox, emails().at(-1)!), 'utf8')) as { to: string; text: string };
    expect(mail.to).toBe(TEST_ADMIN.email);
    return mail.text.match(/Your code: (\d{6})/)![1];
  };

  async function requestCode(page: Page, email: string) {
    await page.goto('/admin/login');
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await expect(page.getByRole('button', { name: 'Send code' })).toBeEnabled();
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Send code' }).click();
    await expect(page.getByText(`If ${email} is the admin email, a 6-digit code is on its way.`)).toBeVisible();
  }

  test('an unknown email gets the same reply and no email is sent', async ({ page }) => {
    const before = emails().length;
    await requestCode(page, 'someone-else@test.local');
    expect(emails().length).toBe(before);
  });

  test('the emailed code resets the password and ends old sessions', async ({ page, browser, request }) => {
    const newPassword = 'a brand new admin password';
    await signIn(page);

    const reset = await (await browser.newContext()).newPage();
    await requestCode(reset, TEST_ADMIN.email);
    const code = latestCode();
    const wrong = code === '000000' ? '111111' : '000000';

    await reset.getByLabel('Code from the email').fill(wrong);
    await reset.getByLabel('New password', { exact: true }).fill(newPassword);
    await reset.getByLabel('Confirm new password').fill(newPassword);
    await reset.getByRole('button', { name: 'Reset password' }).click();
    await expect(reset.locator('form').getByRole('alert')).toHaveText('That code is incorrect or has expired. Request a new code.');

    await reset.getByLabel('Code from the email').fill(code);
    await reset.getByRole('button', { name: 'Reset password' }).click();
    await expect(reset.getByText('Password changed. You have been signed out on every device.')).toBeVisible();

    // The code works once, and the session from before the reset is gone.
    const reuse = await request.post('/api/admin/password-reset/verify', { data: { email: TEST_ADMIN.email, code, password: newPassword } });
    expect(reuse.status()).toBe(400);
    expect((await page.request.get('/api/admin/content')).status()).toBe(401);

    const login = (password: string) => request.post('/api/admin/login', { data: { email: TEST_ADMIN.email, password } });
    expect((await login(TEST_ADMIN.password)).status()).toBe(401);
    expect((await login(newPassword)).status()).toBe(200);

    // Put the original password back so a retried run can still sign in.
    expect((await request.post('/api/admin/password-reset/request', { data: { email: TEST_ADMIN.email } })).status()).toBe(200);
    const restore = await request.post('/api/admin/password-reset/verify', {
      data: { email: TEST_ADMIN.email, code: latestCode(), password: TEST_ADMIN.password },
    });
    expect(restore.status()).toBe(200);
    expect((await login(TEST_ADMIN.password)).status()).toBe(200);
    await reset.context().close();
  });
});
