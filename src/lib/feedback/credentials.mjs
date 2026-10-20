import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

/** @typedef {{version: 1, salt: string, hash: string, secret: string, cost?: {N: number, r: number, p: number}}} AdminCredentials */
const cost = {N: 32768, r: 8, p: 3};
/** @param {string} password @param {string} salt @param {{N:number,r:number,p:number}} parameters @returns {Promise<Buffer>} */
function derive(password, salt, parameters) {
  return new Promise((resolve, reject) => scrypt(password, salt, 64, {...parameters, maxmem: 64 * 1024 * 1024},
    (error, key) => error ? reject(error) : resolve(key)));
}
/** @param {string} password @returns {Promise<AdminCredentials>} */
export async function createCredentials(password) {
  if (password.length < 12 || password.length > 256) throw new Error('Use a password of 12-256 characters');
  const salt = randomBytes(16).toString('hex');
  return {version: 1, salt, hash: (await derive(password, salt, cost)).toString('hex'), cost, secret: randomBytes(32).toString('hex')};
}
/** @param {unknown} value @returns {value is AdminCredentials} */
export function validCredentials(value) {
  if (!value || typeof value !== 'object') return false;
  const data = /** @type {Record<string, unknown>} */ (value);
  const params = /** @type {{N?:number,r?:number,p?:number} | undefined} */ (data.cost);
  if (params !== undefined && (!params || params.N !== cost.N || params.r !== cost.r || params.p !== cost.p)) return false;
  return data.version === 1 && typeof data.salt === 'string' && /^[a-f0-9]{32}$/.test(data.salt)
    && typeof data.hash === 'string' && /^[a-f0-9]{128}$/.test(data.hash)
    && typeof data.secret === 'string' && /^[a-f0-9]{64}$/.test(data.secret);
}
/** @param {string} password @param {AdminCredentials} credentials */
export async function verifyPassword(password, credentials) {
  if (password.length > 256 || !validCredentials(credentials)) return false;
  return timingSafeEqual(await derive(password, credentials.salt, credentials.cost ?? {N:16384,r:8,p:1}), Buffer.from(credentials.hash, 'hex'));
}
