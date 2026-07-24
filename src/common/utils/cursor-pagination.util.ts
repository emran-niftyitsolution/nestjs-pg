// src/common/utils/cursor-pagination.util.ts

import type { AnyColumn, SQL } from 'drizzle-orm';
import { withCursorPagination as untypedWithCursorPagination } from 'drizzle-pagination';

type CursorTuple =
  | [AnyColumn, 'asc' | 'desc']
  | [AnyColumn, 'asc' | 'desc', unknown];

interface CursorPaginationResult {
  where?: SQL;
  orderBy: SQL[];
  limit: number;
}

/**
 * Thin, correctly-typed wrapper around drizzle-pagination's
 * withCursorPagination. Its own .d.ts infers `never` for the cursor value
 * types against our drizzle-orm version — a version mismatch between the
 * two packages' generics (drizzle-pagination hasn't been updated since
 * Nov 2024), not a bug in how we're calling it. Its runtime code is a few
 * lines of asc/desc/gt/lt/and/or/eq composition that's stable across
 * drizzle-orm versions, so this cast is safe. Isolating it here means every
 * *caller* still gets full type-checking against this wrapper's signature.
 */
export function withCursorPagination(options: {
  where?: SQL;
  limit: number;
  cursors: [CursorTuple] | [CursorTuple, CursorTuple];
}): CursorPaginationResult {
  return untypedWithCursorPagination(options as never);
}
