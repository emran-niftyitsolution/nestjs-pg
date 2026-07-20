// src/common/interfaces/cursor-paginated-result.interface.ts

export interface CursorPaginatedResult<T> {
  data: T[];
  meta: {
    limit: number;
    hasNextPage: boolean;
    // Pass this back as `cursor` to fetch the next page; null on the last page.
    nextCursor: string | null;
  };
}
