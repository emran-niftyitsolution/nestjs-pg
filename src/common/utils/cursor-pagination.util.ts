// src/common/utils/cursor-pagination.util.ts

type CursorTuple = [field: string, direction: 'asc' | 'desc', value?: unknown];

interface CursorPaginationResult {
  where?: Record<string, unknown>;
  orderBy: Record<string, 'asc' | 'desc'>[];
  limit: number;
}

/**
 * Manual keyset-pagination composer — does directly what drizzle-pagination
 * used to do under the hood: build a `WHERE (primary, secondary) > (cursorA,
 * cursorB)`-style filter plus a matching ORDER BY, from 1-2 (field name,
 * direction, decoded cursor value) tuples. Prisma has no query-builder-level
 * equivalent for this (native `cursor`/`skip`/`take` only supports a single
 * unique field, not this project's primary-sort + unique-tiebreaker
 * pattern), and no column-object handles the way Drizzle did — callers pass
 * field-name strings instead, which is why this stays loosely typed
 * (Record<string, unknown>) rather than generic-per-model: isolating that
 * one necessary type-safety compromise here means every *caller* still gets
 * full type-checking on everything else in its own `findMany` call.
 *
 * Callers are responsible for the `limit + 1` over-fetch (to detect
 * hasNextPage without a COUNT query) and for slicing/encoding the next
 * cursor afterwards — this function only composes the query shape.
 */
export function withCursorPagination(options: {
  where?: Record<string, unknown>;
  limit: number;
  cursors: [CursorTuple] | [CursorTuple, CursorTuple];
}): CursorPaginationResult {
  const { where, limit, cursors } = options;

  const orderBy = cursors.map(([field, direction]) => ({
    [field]: direction,
  }));

  const isFirstPage = cursors.some(
    ([, , value]) => value === undefined || value === null,
  );
  if (isFirstPage) {
    return { where, orderBy, limit };
  }

  const op = (direction: 'asc' | 'desc') => (direction === 'asc' ? 'gt' : 'lt');

  let cursorWhere: Record<string, unknown>;
  if (cursors.length === 1) {
    const [field, direction, value] = cursors[0];
    cursorWhere = { [field]: { [op(direction)]: value } };
  } else {
    const [
      [primaryField, primaryDirection, primaryValue],
      [secondaryField, secondaryDirection, secondaryValue],
    ] = cursors;
    cursorWhere = {
      OR: [
        { [primaryField]: { [op(primaryDirection)]: primaryValue } },
        {
          [primaryField]: primaryValue,
          [secondaryField]: { [op(secondaryDirection)]: secondaryValue },
        },
      ],
    };
  }

  return {
    where: where ? { AND: [where, cursorWhere] } : cursorWhere,
    orderBy,
    limit,
  };
}
