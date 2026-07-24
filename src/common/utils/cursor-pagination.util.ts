// src/common/utils/cursor-pagination.util.ts

import type { CursorPaginatedResult } from '@/common/interfaces/cursor-paginated-result.interface';
import { encodeCursor } from './cursor.util';

export type SortDirection = 'asc' | 'desc';

// `field` is a Prisma model field name (camelCase, matching schema.prisma —
// not the raw snake_case DB column), used as an object key into a
// Prisma `where`/`orderBy` input, so it must only ever come from a fixed,
// TS-known string at the call site, never from user input.
export type CursorTuple =
  | readonly [field: string, direction: SortDirection]
  | readonly [field: string, direction: SortDirection, cursorValue: unknown];

export interface CursorPaginationQBOptions {
  // Base filter as a plain Prisma where object (untyped here since this
  // utility is model-agnostic) — cast the result back to the caller's own
  // `Prisma.XWhereInput` at the call site. Omit when there's no base filter.
  where?: Record<string, unknown>;
  limit: number;
  cursors: readonly [CursorTuple] | readonly [CursorTuple, CursorTuple];
}

export interface CursorPaginationQB {
  // Always a plain object (`{}` when there's neither a base filter nor a
  // cursor yet) so callers can always pass this straight to `findMany`.
  where: Record<string, unknown>;
  // One entry per cursor column, in order — pass straight to `orderBy`.
  orderBy: Array<Record<string, SortDirection>>;
  take: number;
}

function seekWhere(
  cursors: readonly [CursorTuple] | readonly [CursorTuple, CursorTuple],
): Record<string, unknown> | undefined {
  const [[field1, dir1, v1], second] = cursors;
  if (v1 === undefined) return undefined; // first page: no seek filter yet

  const op1 = dir1 === 'asc' ? 'gt' : 'lt';
  const primary = { [field1]: { [op1]: v1 } };

  if (!second || second[2] === undefined) {
    return primary;
  }

  const [field2, dir2, v2] = second;
  const op2 = dir2 === 'asc' ? 'gt' : 'lt';

  // OR-decomposed composite seek predicate — not a row-value comparison
  // `(col1, col2) > (v1, v2)`, which only works when every column sorts in
  // the same direction. Needed because the tiebreaker (id) is always
  // ascending while the primary sort column can be either.
  return { OR: [primary, { [field1]: v1, [field2]: { [op2]: v2 } }] };
}

/**
 * Builds a keyset-pagination where/orderBy pair for a 1-2 column composite
 * cursor, as plain Prisma Client query-builder input — pass straight to
 * `findMany({ where, orderBy, take })`. Replaces the earlier raw-SQL
 * ($queryRaw + Prisma.sql) version: the same OR-decomposed seek predicate,
 * expressed as Prisma's `where` DSL instead of hand-built SQL.
 */
export function withCursorPagination(
  options: CursorPaginationQBOptions,
): CursorPaginationQB {
  const seek = seekWhere(options.cursors);
  const base = options.where;

  const where = base && seek ? { AND: [base, seek] } : (seek ?? base ?? {});

  const orderBy = options.cursors.map(([field, direction]) => ({
    [field]: direction,
  }));

  return { where, orderBy, take: options.limit };
}

/**
 * Turns a limit+1-row query result into a page: slices back down to limit,
 * decides hasNextPage, and mints nextCursor from the last surviving row.
 */
export function toCursorPage<Row, Item = Row>(
  rows: Row[],
  limit: number,
  toCursorValues: (lastRow: Row) => unknown[],
  mapItem: (row: Row) => Item = (row) => row as unknown as Item,
): CursorPaginatedResult<Item> {
  const hasNextPage = rows.length > limit;
  const pageRows = hasNextPage ? rows.slice(0, limit) : rows;
  const last = pageRows.at(-1);
  const nextCursor =
    hasNextPage && last ? encodeCursor(...toCursorValues(last)) : null;

  return {
    data: pageRows.map(mapItem),
    meta: { limit, hasNextPage, nextCursor },
  };
}
