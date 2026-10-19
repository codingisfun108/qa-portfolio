'use client';

import { Analytics } from '@vercel/analytics/next';

// Admin visits are the site owner's own traffic, so they are left out of the stats.
export default function SiteAnalytics() {
  return <Analytics beforeSend={(event) => (new URL(event.url).pathname.startsWith('/admin') ? null : event)} />;
}
