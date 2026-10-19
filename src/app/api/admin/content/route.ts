import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { guardAdmin } from '@/lib/auth';
import { contentSchema } from '@/lib/schema';
import { StorageNotConfiguredError, getContent, saveContent } from '@/lib/store';
import { seed } from '@/content/seed';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await guardAdmin();
  if (denied) return denied;
  return NextResponse.json(await getContent(), { headers: { 'Cache-Control': 'no-store' } });
}

/** Saves the whole content document. Body: the content, or { reset: true } for the starting content. */
export async function PUT(request: Request) {
  const denied = await guardAdmin({ mutating: true });
  if (denied) return denied;

  const raw = await request.json().catch(() => null);
  const candidate = raw && typeof raw === 'object' && 'reset' in raw && raw.reset === true ? seed : raw;
  const parsed = contentSchema.safeParse(candidate);
  if (!parsed.success) {
    const issues = parsed.error.issues.slice(0, 8).map((i) => ({ path: i.path.join('.'), message: i.message }));
    return NextResponse.json({ error: 'Some fields need fixing before you can save.', issues }, { status: 400 });
  }

  const slugs = parsed.data.posts.map((p) => p.slug);
  if (new Set(slugs).size !== slugs.length) {
    return NextResponse.json({ error: 'Two posts share the same URL slug. Give each post its own slug.' }, { status: 400 });
  }

  try {
    const saved = await saveContent(parsed.data);
    revalidatePath('/', 'layout');
    return NextResponse.json(saved);
  } catch (err) {
    const message = err instanceof StorageNotConfiguredError ? err.message : 'Saving failed. Try again in a minute.';
    console.error('Save failed', err);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
