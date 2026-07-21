// src/common/utils/zod-boolean-query.util.ts

import { z } from 'zod';

/**
 * Query-string booleans arrive as the literal strings "true"/"false". Unlike
 * the old class-validator `ToBoolean()` decorator, this needs no workaround
 * for implicit-conversion corrupting the value first — Zod only runs the
 * coercion we write here, so `?isActive=false` reaches `.toLowerCase()` as
 * the untouched string, not JS's `Boolean("false") === true` trap.
 */
export function booleanQuerySchema() {
  return z.preprocess((raw) => {
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'string') return raw.toLowerCase() === 'true';
    return raw;
  }, z.boolean());
}
