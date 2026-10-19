import { NextResponse } from 'next/server';
import { guardAdmin } from '@/lib/auth';
import { saveUpload } from '@/lib/store';

// Vercel functions accept request bodies up to 4.5 MB, so uploads are capped at 4 MB.
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Map([
  ['image/jpeg', 'image'],
  ['image/png', 'image'],
  ['image/webp', 'image'],
  ['image/avif', 'image'],
  ['application/pdf', 'pdf'],
]);

export async function POST(request: Request) {
  const denied = await guardAdmin({ mutating: true });
  if (denied) return denied;

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 });
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: 'Upload a JPG, PNG, WebP, AVIF or PDF file.' }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'That file is over 4 MB. Compress it and try again.' }, { status: 413 });
  }

  try {
    return NextResponse.json({ url: await saveUpload(file) });
  } catch (err) {
    console.error('Upload failed', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Upload failed.' }, { status: 503 });
  }
}
