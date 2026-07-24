// src/common/utils/cursor-pagination.util.ts

import type { CursorPaginatedResult } from '@/common/interfaces/cursor-paginated-result.interface';
import { Prisma } from '@/generated/prisma/client';
import { encodeCursor } from './cursor.util';

export type SortDirection = 'asc' | 'desc';

// `column` is the raw Postgres column name (snake_case, matching each
// model's @map in schema.prisma) — it goes straight into a $queryRaw
// template via Prisma.raw, so it must only ever come from a fixed,
// TS-known string at the call site, never from user input.
export type CursorTuple =
  | readonly [column: string, direction: SortDirection]
  | readonly [column: string, direction: SortDirection, cursorValue: unknown];

export interface CursorPaginationSqlOptions {
  // Base filter as a bare Prisma.Sql fragment with no leading WHERE.
  // Omit when there's no base filter.
  where?: Prisma.Sql;
  limit: number;
  cursors: readonly [CursorTuple] | readonly [CursorTuple, CursorTuple];
}

export interface CursorPaginationSql {
  // Always non-empty (`true` when there's neither a base filter nor a
  // cursor yet) so callers can always write `WHERE ${where}` unconditionally.
  where: Prisma.Sql;
  // Bare `col1 dir1, col2 dir2` fragment — splice directly after ORDER BY.
  orderBy: Prisma.Sql;
  limit: number;
}

const quoteIdent = (name: string): Prisma.Sql => Prisma.raw(`"${name}"`);

function seekPredicate(
  cursors: readonly [CursorTuple] | readonly [CursorTuple, CursorTuple],
): Prisma.Sql | undefined {
  const [[col1, dir1, v1], second] = cursors;
  if (v1 === undefined) return undefined; // first page: no seek filter yet

  const gt1 = dir1 === 'asc' ? Prisma.sql`>` : Prisma.sql`<`;
  const primary = Prisma.sql`${quoteIdent(col1)} ${gt1} ${v1}`;

  if (!second || second[2] === undefined) {
    return primary;
  }

  const [col2, dir2, v2] = second;
  const gt2 = dir2 === 'asc' ? Prisma.sql`>` : Prisma.sql`<`;

  // OR-decomposed composite seek predicate — not a row-value comparison
  // `(col1, col2) > (v1, v2)`, which only works when every column sorts in
  // the same direction. Needed because the tiebreaker (id) is always
  // ascending while the primary sort column can be either.
  return Prisma.sql`(${primary}) OR (${quoteIdent(col1)} = ${v1} AND ${quoteIdent(col2)} ${gt2} ${v2})`;
}

/**
 * Builds a keyset-pagination WHERE/ORDER BY fragment pair for a 1-2 column
 * composite cursor, for splicing into a $queryRaw template. Replaces the old
 * drizzle-pagination wrapper; same shape (where/orderBy/limit), Prisma.sql
 * instead of drizzle SQL.
 */
export function withCursorPagination(
  options: CursorPaginationSqlOptions,
): CursorPaginationSql {
  const predicate = seekPredicate(options.cursors);
  const base = options.where;

  const where =
    base && predicate
      ? Prisma.sql`(${base}) AND (${predicate})`
      : (predicate ?? base ?? Prisma.sql`true`);

  const orderBy = Prisma.join(
    options.cursors.map(
      ([column, direction]) =>
        Prisma.sql`${quoteIdent(column)} ${Prisma.raw(direction)}`,
    ),
    ', ',
  );

  return { where, orderBy, limit: options.limit };
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
