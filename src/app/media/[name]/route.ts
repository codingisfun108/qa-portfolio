import { readLocalUpload } from '@/lib/store';

// Serves files uploaded from the admin panel when running locally without Vercel Blob.
const TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  pdf: 'application/pdf',
};

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const file = await readLocalUpload(name);
  if (!file) return new Response('Not found', { status: 404 });
  const ext = name.split('.').pop() ?? '';
  return new Response(new Uint8Array(file), {
    headers: { 'Content-Type': TYPES[ext] ?? 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
}
