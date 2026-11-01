import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

/** A random 6-digit login code, e.g. '048213'. */
export function generateLoginCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** A long random token that identifies a signed-in device. */
export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/** One-way hash, so the database never holds a usable code or token. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Compares two hex hashes without leaking timing information. */
export function hashesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}
