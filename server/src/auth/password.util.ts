import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const PREFIX = 'scrypt';
const KEYLEN = 64;

/** Gera hash no formato scrypt$saltHex$keyHex */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const key = scryptSync(plain, salt, KEYLEN).toString('hex');
  return `${PREFIX}$${salt}$${key}`;
}

/**
 * Verifica senha contra hash scrypt$.
 * Senhas em texto puro não são aceitas — migre o usuário com hashPassword.
 */
export function verifyPassword(plain: string, stored: string): boolean {
  if (!stored || !plain) return false;
  if (!stored.startsWith(`${PREFIX}$`)) return false;

  const [, salt, keyHex] = stored.split('$');
  if (!salt || !keyHex) return false;

  const derived = scryptSync(plain, salt, KEYLEN);
  const expected = Buffer.from(keyHex, 'hex');
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
