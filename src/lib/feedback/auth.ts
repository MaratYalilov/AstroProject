import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink, readdir } from 'node:fs/promises';
import path from 'node:path';
import { feedbackDataDir } from './paths.mjs';
import type { AdminCredentials } from './credentials.mjs';
import { readAdminCredentials } from './store';

export const adminCookieName = 'hutba_admin';
export const adminSessionSeconds = 8 * 60 * 60;
function sign(value: string, secret: string) { return createHmac('sha256', Buffer.from(secret, 'hex')).update(value).digest('base64url'); }
function equal(a: string, b: string) {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export async function createAdminSession(credentials: AdminCredentials, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({expires: now + adminSessionSeconds * 1000, nonce: randomBytes(24).toString('base64url')})).toString('base64url');
  const token = payload + '.' + sign(payload, credentials.secret);
  const dir = path.join(feedbackDataDir(), 'sessions');
  await mkdir(dir, {recursive: true, mode: 0o700});
  for (const name of await readdir(dir)) {
    if (!/^[a-f0-9]{64}\.json$/.test(name)) continue;
    const file = path.join(dir, name);
    try { if (JSON.parse(await readFile(file, 'utf8')).expires <= now) await unlink(file); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  await writeFile(sessionFile(token), JSON.stringify({expires: now + adminSessionSeconds * 1000}), {flag: 'wx', mode: 0o600});
  return token;
}
export async function adminSession(token: string | undefined, now = Date.now()) {
  if (!token || token.length > 1024) return null;
  const credentials = await readAdminCredentials();
  if (!credentials) return null;
  const parts = token.split('.');
  if (parts.length !== 2 || !equal(parts[1], sign(parts[0], credentials.secret))) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (typeof payload.expires !== 'number' || payload.expires <= now || typeof payload.nonce !== 'string') return null;
    const saved = JSON.parse(await readFile(sessionFile(token), 'utf8'));
    if (saved.expires !== payload.expires) return null;
    return {csrf: sign('csrf:' + token, credentials.secret)};
  } catch { return null; }
}
export function validCsrf(value: string, session: {csrf: string}) { return equal(value, session.csrf); }

function sessionFile(token: string) {
  return path.join(feedbackDataDir(), 'sessions', createHash('sha256').update(token).digest('hex') + '.json');
}
export async function destroyAdminSession(token: string) {
  await unlink(sessionFile(token)).catch(error => { if (error.code !== 'ENOENT') throw error; });
}
