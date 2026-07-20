// src/common/utils/token-hash.util.ts

import { createHash, randomBytes } from 'node:crypto';

/** A high-entropy, URL-safe random token — used for refresh and password-reset tokens. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * SHA-256 is intentionally used here instead of argon2/bcrypt. Those are
 * deliberately slow so brute-forcing a low-entropy *password* is expensive —
 * but that same slowness would make every token lookup slow, and it buys
 * nothing here because a 256-bit random token has no guessable structure.
 * A fast, deterministic hash lets us index the column and look it up in
 * O(1) while still never storing the raw token at rest.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
