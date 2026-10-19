
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import SiteAnalytics from '@/components/SiteAnalytics';
import { getContent } from '@/lib/store';
import './globals.css';

const schibsted = localFont({
  src: [
    { path: '../fonts/schibsted-grotesk-latin-400-normal.woff2', weight: '400' },
    { path: '../fonts/schibsted-grotesk-latin-600-normal.woff2', weight: '600' },
    { path: '../fonts/schibsted-grotesk-latin-700-normal.woff2', weight: '700' },
    { path: '../fonts/schibsted-grotesk-latin-800-normal.woff2', weight: '800' },
  ],
  variable: '--font-schibsted',
  display: 'swap',
});

const jetbrains = localFont({
  src: [{ path: '../fonts/jetbrains-mono-latin-500-normal.woff2', weight: '500' }],
  variable: '--font-jetbrains',
  display: 'swap',
});

function baseUrl(siteUrl: string) {
  if (siteUrl) return siteUrl;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return 'http://localhost:3000';
}

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getContent();
  const title = site.seoTitle || `${site.name}, ${site.role}`;
  return {
    metadataBase: new URL(baseUrl(site.siteUrl)),
    title: { default: title, template: `%s | ${site.name}` },
    description: site.seoDescription,
    authors: [{ name: site.name }],
    alternates: { canonical: '/' },
    openGraph: { type: 'profile', title, description: site.seoDescription, siteName: site.name },
    twitter: { card: 'summary_large_image', title, description: site.seoDescription },
  };
}

export const viewport: Viewport = {
  themeColor: '#f7f9f7',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${schibsted.variable} ${jetbrains.variable}`}>
      <body>
        {children}
        {/* Vercel Web Analytics only exists on Vercel deployments. */}
        {process.env.VERCEL && <SiteAnalytics />}
      </body>
    </html>
  );
}
