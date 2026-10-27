# Rahul Kumar Sharma — QA Lead portfolio

Personal portfolio with a password-protected admin panel. Everything on the public site (text, photo, resume, projects, jobs, section order and visibility, blog posts) is edited at `/admin` and goes live on save. Built with Next.js, hosted free on Vercel, and tested with Playwright on every push.

![Playwright tests](https://github.com/<you>/qa-portfolio/actions/workflows/playwright.yml/badge.svg)

## What's included

**Public site**
- Hero with availability badge, photo, stats and resume download
- Animated release sign-off panel (checks tick off as you scroll)
- Projects, impact numbers, experience timeline, toolkit, recognition, certifications, writing (blog), now and education
- Contact cards (copy buttons, phone shown only on request) and a contact form with spam protection
- SEO: page metadata, generated link-preview image, `sitemap.xml`, `robots.txt`, JSON-LD Person data
- Vercel Web Analytics, security headers, accessible (axe WCAG 2.2 AA checked in CI)

**Admin panel (`/admin`)**
- Email and password sign-in, with a 7-day session in an httpOnly cookie
- Editors for every section; add, remove, reorder, show and hide any item
- Turn whole sections on or off, rename them, reorder them, choose what appears in the menu
- Upload photo, resume PDF and recognition images
- Blog posts in Markdown with drafts
- Inbox for contact-form messages, with optional email alerts
- Backup download and restore, reset to starting content, sign out on all devices
- Unsaved-changes warning and Ctrl/Cmd+S to save

## Deploy on Vercel (about 15 minutes, free)

1. **Push to GitHub.** Create a new public repo, then from this folder:
   ```bash
   git init && git add . && git commit -m "Portfolio with admin panel"
   git branch -M main
   git remote add origin https://github.com/<you>/qa-portfolio.git
   git push -u origin main
   ```
2. **Import on Vercel.** At vercel.com, sign in with GitHub, choose **Add New → Project**, pick the repo and click **Deploy**. The site goes live with the starting content.
3. **Connect storage.** In the project, open **Storage**:
   - **Create Database → Upstash for Redis** (free plan), and connect it to this project. It stores your content and messages.
   - **Create → Blob**, and connect it to this project. It stores uploaded photos and PDFs.

   Vercel adds the connection keys to the project automatically.
4. **Set your admin login.** On your computer, in this folder:
   ```bash
   npm install
   npm run hash-password
   ```
   Enter a password of 12+ characters. It prints two values. In Vercel, open **Settings → Environment Variables** and add:

   | Name | Value |
   | --- | --- |
   | `ADMIN_EMAIL` | the email you'll sign in with |
   | `ADMIN_PASSWORD_HASH` | the first value printed |
   | `SESSION_SECRET` | the second value printed |

   Your password itself is never stored anywhere; only its hash is.
5. **Redeploy.** **Deployments → ⋯ → Redeploy.** Then open `https://<your-site>.vercel.app/admin` and sign in.
6. **Finish in the admin panel.** Under **SEO and sharing**, set the site address and this repo's URL (adds a "See the tests" link in the footer).

**Optional extras**
- **Email alerts for new messages:** create a free resend.com account, then add `RESEND_API_KEY` and `NOTIFY_EMAIL` in Vercel and redeploy.
- **Visitor stats:** in Vercel, open **Analytics** and click **Enable**.
- **Your own domain:** **Settings → Domains**.

The Hobby plan is for personal, non-commercial projects, which covers a portfolio.

## Change your password

**Forgot it?** Click **Forgot password?** on the sign-in page and enter the admin email (`ADMIN_EMAIL`). A 6-digit code is emailed to that address. Enter it with a new password (12+ characters). The code expires after 10 minutes and stops working after 5 wrong tries. This needs Redis storage and `RESEND_API_KEY` in Vercel. With Resend's shared `onboarding@resend.dev` sender, Resend only delivers to the email your Resend account uses, so either make that your `ADMIN_EMAIL` or verify your own domain and set `NOTIFY_FROM`.

**From the terminal:** run `npm run hash-password` again, replace `ADMIN_PASSWORD_HASH` in Vercel and redeploy. A new hash in Vercel always replaces a password set through the reset page.

Either way, every existing session ends automatically. Locally (no `RESEND_API_KEY`), reset emails are saved to `.data/outbox/` instead of being sent.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in the admin values from `npm run hash-password`
npm run dev                   # http://localhost:3000 and http://localhost:3000/admin
```

Without Redis keys, content is saved to a local `.data/` folder, so you can try the admin panel offline.

## Tests

```bash
npx playwright install chromium   # first time only
npm test                          # builds, starts a test server, runs everything
npm run test:report               # opens the HTML report
BASE_URL=https://your-site.vercel.app npx playwright test --project=site-desktop --project=site-mobile
```

The test server uses its own throwaway data folder and test-only credentials, so tests never touch your real content.

| Suite | What it checks |
| --- | --- |
| `tests/site.spec.ts` (desktop and Pixel 7) | Page loads with no console errors; every visible section renders from data and hidden ones don't; sign-off panel reaches all checks passed; menu, Hire me and external links; resume PDF served; phone hidden until requested; contact form validation, sending, bad input and honeypot; axe WCAG 2.2 AA; no horizontal scroll; one h1 and alt text; meta, Open Graph and JSON-LD; sitemap, robots and preview image; 404s for unknown pages and drafts |
| `tests/admin.spec.ts` | Redirect to sign-in when signed out; admin APIs return 401; forged cookie rejected; wrong password; cross-site sign-in blocked; httpOnly cookie; edit headline and see it live; hide a section; add a project; publish a post; invalid URL refused with the field name; inbox read, unread and delete; sign out |

## How it works

| Piece | Choice | Why |
| --- | --- | --- |
| Framework | Next.js App Router | Static pages for speed, plus server routes for the admin API in one Vercel project |
| Content | One JSON document validated with Zod, stored in Upstash Redis | One read per page build; the schema rejects bad data before it reaches the site |
| Freshness | Pages are static and refresh on save (`revalidatePath`) | Fast for visitors, instant updates for you, few Redis reads (free tier: 500K commands/month) |
| Files | Vercel Blob | Free on Hobby (1 GB), public CDN URLs |
| Auth | scrypt password hash in an env var, HS256 JWT session cookie (jose) | No user database needed for a single admin; changing the hash ends old sessions |
| Defences | Proxy gate plus a second check in every admin route; Origin check on writes; rate limits on sign-in (5 per 15 min) and contact (3 per hour); honeypot; `noindex` and no framing for `/admin`; Markdown rendered without raw HTML | Defence in depth: each layer still holds if another is bypassed |

Starting content lives in `src/content/seed.ts`. The schema is `src/lib/schema.ts`.
