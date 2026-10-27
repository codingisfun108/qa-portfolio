import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Redis } from '@upstash/redis';
import { seed } from '@/content/seed';
import { contentSchema, normalizeSections, type Content, type Message } from './schema';

// Storage backends:
// - Upstash Redis (production on Vercel): content, messages and session settings.
// - Local JSON files in DATA_DIR (development and tests) when Redis isn't configured.
// On Vercel without Redis the site still works (it shows the starting content), but saving
// from the admin panel returns a clear "connect storage" error.

const KEY_CONTENT = 'portfolio:content';
const KEY_MESSAGES = 'portfolio:messages';
const KEY_SESSION_EPOCH = 'portfolio:session-epoch';
const KEY_PASSWORD = 'portfolio:admin-password';
const KEY_PASSWORD_RESET = 'portfolio:password-reset';
const MAX_MESSAGES = 500;

export class StorageNotConfiguredError extends Error {
  constructor() {
    super(
      'Storage is not connected. In Vercel, open Storage, add Upstash for Redis, connect it to this project, then redeploy.',
    );
  }
}

function redisEnv() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

let redisClient: Redis | null | undefined;
export function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const env = redisEnv();
  redisClient = env ? new Redis({ url: env.url, token: env.token }) : null;
  return redisClient;
}

// Local file storage is for development and tests only; the ignore comments keep Vercel's
// file tracing from bundling the whole project into the server functions.
const dataDir = () => path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.DATA_DIR || '.data');
const canUseFiles = () => !process.env.VERCEL;

export function storageMode(): 'redis' | 'file' | 'readonly' {
  if (getRedis()) return 'redis';
  return canUseFiles() ? 'file' : 'readonly';
}

async function readJsonFile<T>(name: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(/*turbopackIgnore: true*/ dataDir(), name), 'utf8')) as T;
  } catch {
    return null;
  }
}

async function writeJsonFile(name: string, value: unknown) {
  await fs.mkdir(dataDir(), { recursive: true });
  const file = path.join(/*turbopackIgnore: true*/ dataDir(), name);
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2));
  await fs.rename(tmp, file);
}

async function readRaw<T>(key: string, file: string): Promise<T | null> {
  const redis = getRedis();
  if (redis) return (await redis.get<T>(key)) ?? null;
  if (canUseFiles()) return readJsonFile<T>(file);
  return null;
}

async function writeRaw(key: string, file: string, value: unknown) {
  const redis = getRedis();
  if (redis) {
    await redis.set(key, value);
    return;
  }
  if (!canUseFiles()) throw new StorageNotConfiguredError();
  await writeJsonFile(file, value);
}

/** Stored content merged over the starting content, so new fields always have a value. */
export function coerceContent(raw: unknown): Content {
  if (!raw || typeof raw !== 'object') return seed;
  const stored = raw as Partial<Content>;
  const merged = {
    ...seed,
    ...stored,
    site: { ...seed.site, ...(stored.site ?? {}) },
    hero: { ...seed.hero, ...(stored.hero ?? {}) },
    signoff: { ...seed.signoff, ...(stored.signoff ?? {}) },
    contact: { ...seed.contact, ...(stored.contact ?? {}) },
    sections: normalizeSections((stored.sections as Content['sections']) ?? seed.sections, seed.sections),
  };
  const parsed = contentSchema.safeParse(merged);
  if (parsed.success) return parsed.data;
  console.error('Stored content failed validation; showing starting content.', parsed.error.issues.slice(0, 3));
  return seed;
}

export async function getContent(): Promise<Content> {
  try {
    return coerceContent(await readRaw<Content>(KEY_CONTENT, 'content.json'));
  } catch (err) {
    console.error('Could not read content; showing starting content.', err);
    return seed;
  }
}

export async function saveContent(next: Content): Promise<Content> {
  const value = { ...next, updatedAt: new Date().toISOString() };
  await writeRaw(KEY_CONTENT, 'content.json', value);
  return value;
}

// Messages from the contact form
export async function listMessages(): Promise<Message[]> {
  return (await readRaw<Message[]>(KEY_MESSAGES, 'messages.json')) ?? [];
}

export async function addMessage(input: Omit<Message, 'id' | 'receivedAt' | 'read'>): Promise<Message> {
  const message: Message = { ...input, id: randomUUID(), receivedAt: new Date().toISOString(), read: false };
  const current = await listMessages();
  await writeRaw(KEY_MESSAGES, 'messages.json', [message, ...current].slice(0, MAX_MESSAGES));
  return message;
}

export async function updateMessages(fn: (all: Message[]) => Message[]) {
  await writeRaw(KEY_MESSAGES, 'messages.json', fn(await listMessages()));
}

// "Sign out everywhere": sessions issued before this time are rejected.
export async function getSessionEpoch(): Promise<number> {
  try {
    return Number((await readRaw<number>(KEY_SESSION_EPOCH, 'session-epoch.json')) ?? 0);
  } catch {
    return 0;
  }
}

export async function bumpSessionEpoch() {
  await writeRaw(KEY_SESSION_EPOCH, 'session-epoch.json', Math.floor(Date.now() / 1000));
}

// Password set through "Forgot password". `base` records which ADMIN_PASSWORD_HASH it replaced,
// so putting a new hash in Vercel still takes over (see lib/password-reset.ts).
export type StoredPassword = { hash: string; base: string };

export async function getStoredPassword(): Promise<StoredPassword | null> {
  return readRaw<StoredPassword>(KEY_PASSWORD, 'admin-password.json');
}

export async function saveStoredPassword(value: StoredPassword) {
  await writeRaw(KEY_PASSWORD, 'admin-password.json', value);
}

// The pending reset code (only its keyed hash), with expiry and wrong-guess count.
export type ResetRequest = { codeHash: string; createdAt: number; expiresAt: number; attempts: number };

export async function getResetRequest(): Promise<ResetRequest | null> {
  return readRaw<ResetRequest>(KEY_PASSWORD_RESET, 'password-reset.json');
}

export async function saveResetRequest(value: ResetRequest | null) {
  await writeRaw(KEY_PASSWORD_RESET, 'password-reset.json', value);
}

// Uploads (photo, resume, recognition images)
export async function saveUpload(file: File): Promise<string> {
  const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '') || 'file';
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob');
    const blob = await put(`portfolio/${safe}`, file, { access: 'public', addRandomSuffix: true });
    return blob.url;
  }
  if (!canUseFiles()) {
    throw new Error('File storage is not connected. In Vercel, open Storage, add Blob, connect it to this project, then redeploy.');
  }
  const name = `${Date.now()}-${safe}`;
  const dir = path.join(/*turbopackIgnore: true*/ dataDir(), 'uploads');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(/*turbopackIgnore: true*/ dir, name), Buffer.from(await file.arrayBuffer()));
  return `/media/${name}`;
}

export async function readLocalUpload(name: string): Promise<Buffer | null> {
  if (!/^[a-z0-9.-]+$/.test(name)) return null;
  try {
    return await fs.readFile(path.join(/*turbopackIgnore: true*/ dataDir(), 'uploads', name));
  } catch {
    return null;
  }
}
