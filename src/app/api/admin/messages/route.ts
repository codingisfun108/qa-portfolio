import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardAdmin } from '@/lib/auth';
import { listMessages, updateMessages } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await guardAdmin();
  if (denied) return denied;
  return NextResponse.json(await listMessages(), { headers: { 'Cache-Control': 'no-store' } });
}

const patch = z.object({ id: z.string().min(1), read: z.boolean() });

export async function PATCH(request: Request) {
  const denied = await guardAdmin({ mutating: true });
  if (denied) return denied;
  const parsed = patch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  await updateMessages((all) => all.map((m) => (m.id === parsed.data.id ? { ...m, read: parsed.data.read } : m)));
  return NextResponse.json(await listMessages());
}

export async function DELETE(request: Request) {
  const denied = await guardAdmin({ mutating: true });
  if (denied) return denied;
  const parsed = z.object({ id: z.string().min(1) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  await updateMessages((all) => all.filter((m) => m.id !== parsed.data.id));
  return NextResponse.json(await listMessages());
}
