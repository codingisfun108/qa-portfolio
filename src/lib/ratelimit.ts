import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { getRedis } from './store';

// Sliding-window limits. Uses Redis in production so limits hold across serverless instances;
// falls back to memory locally.

type Limit = { requests: number; windowSeconds: number };
export const LIMITS = {
  login: { requests: 5, windowSeconds: 15 * 60 },
  contact: { requests: 3, windowSeconds: 60 * 60 },
} satisfies Record<string, Limit>;

const memory = new Map<string, number[]>();
const limiters = new Map<string, Ratelimit>();

export async function rateLimit(kind: keyof typeof LIMITS, key: string): Promise<{ ok: boolean; retryAfter: number }> {
  if (process.env.DISABLE_RATE_LIMIT === '1') return { ok: true, retryAfter: 0 };
  const { requests, windowSeconds } = LIMITS[kind];
  const redis = getRedis();

  if (redis) {
    let limiter = limiters.get(kind);
    if (!limiter) {
      limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
        prefix: `portfolio:rl:${kind}`,
      });
      limiters.set(kind, limiter);
    }
    const res = await limiter.limit(key);
    return { ok: res.success, retryAfter: Math.max(0, Math.ceil((res.reset - Date.now()) / 1000)) };
  }

  const now = Date.now();
  const id = `${kind}:${key}`;
  const hits = (memory.get(id) ?? []).filter((t) => now - t < windowSeconds * 1000);
  if (hits.length >= requests) {
    memory.set(id, hits);
    return { ok: false, retryAfter: Math.ceil((hits[0] + windowSeconds * 1000 - now) / 1000) };
  }
  hits.push(now);
  memory.set(id, hits);
  return { ok: true, retryAfter: 0 };
}
