// src/users/dto/paginated-result.interface.ts

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    totalDocs: number;
    limit: number;
    page: number;
    totalPages: number;
    pagingCounter: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
    prevPage: number | null;
    nextPage: number | null;
  };
}
