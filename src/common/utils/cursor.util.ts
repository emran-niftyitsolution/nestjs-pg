// src/common/utils/cursor.util.ts

import { BadRequestException } from '@nestjs/common';

/**
 * Packs the two sort-key values of the last row on a page into an opaque,
 * URL-safe token. The client passes it back as-is; it doesn't need to (and
 * shouldn't) know or rely on its internal shape.
 */
export function encodeCursor(primary: unknown, secondary: unknown): string {
  return Buffer.from(JSON.stringify([primary, secondary])).toString(
    'base64url',
  );
}

/**
 * Unpacks a cursor produced by encodeCursor. A malformed/tampered value
 * throws a 400 here rather than surfacing as a confusing 500 further down —
 * there's no security risk either way since Drizzle parameterizes whatever
 * value comes out of this, but a clear error is a better experience.
 */
export function decodeCursor(cursor: string): [unknown, unknown] {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    );
    if (!Array.isArray(parsed) || parsed.length !== 2) {
      throw new Error('malformed cursor shape');
    }
    return parsed as [unknown, unknown];
  } catch {
    throw new BadRequestException('Invalid pagination cursor');
  }
}
