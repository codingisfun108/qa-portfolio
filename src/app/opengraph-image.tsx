import { ImageResponse } from 'next/og';
import { getContent } from '@/lib/store';

// The preview card shown when the site link is shared on LinkedIn, WhatsApp or Slack.
export const alt = 'Portfolio preview';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 3600;

export default async function OgImage() {
  const { site, hero, signoff } = await getContent();
  const checks = signoff.checks.slice(0, 4);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#f7f9f7', padding: 64, fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1.3, justifyContent: 'center', gap: 22 }}>
          <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: '#1b6e45' }}>
            {site.name}, {site.role}
          </div>
          <div style={{ display: 'flex', fontSize: 64, fontWeight: 800, color: '#15201a', lineHeight: 1.05, letterSpacing: -2 }}>
            {hero.headline}
          </div>
          <div style={{ display: 'flex', fontSize: 26, color: '#56635c' }}>{site.location}</div>
        </div>
        {checks.length > 0 && (<div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            marginLeft: 48,
            background: '#13211a',
            borderRadius: 24,
            padding: 36,
            gap: 18,
            justifyContent: 'center',
          }}
        >
          {checks.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, color: '#dfe9e3', fontSize: 26 }}>
              <div style={{ width: 24, height: 24, borderRadius: 12, background: '#6fd39b', display: 'flex' }} />
              {c.gate}
            </div>
          ))}
          <div style={{ display: 'flex', marginTop: 12, color: '#6fd39b', fontSize: 30 }}>
            {signoff.checks.length}/{signoff.checks.length} passed
          </div>
        </div>)}
      </div>
    ),
    size,
  );
}
