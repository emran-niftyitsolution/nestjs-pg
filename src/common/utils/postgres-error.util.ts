// src/common/utils/postgres-error.util.ts

import { DrizzleQueryError } from 'drizzle-orm';

const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';

interface PostgresErrorLike {
  code: string;
}

function hasPostgresErrorCode(error: unknown): error is PostgresErrorLike {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as Record<string, unknown>).code === 'string'
  );
}

function hasCode(error: unknown, code: string): boolean {
  return (
    error instanceof DrizzleQueryError &&
    hasPostgresErrorCode(error.cause) &&
    error.cause.code === code
  );
}

/** A UNIQUE / PRIMARY KEY constraint rejected the row — e.g. a duplicate email or slug. */
export function isUniqueViolation(error: unknown): boolean {
  return hasCode(error, UNIQUE_VIOLATION);
}

/** A FOREIGN KEY constraint rejected the statement — a referenced row is missing, or (with ON DELETE RESTRICT) still referenced by children. */
export function isForeignKeyViolation(error: unknown): boolean {
  return hasCode(error, FOREIGN_KEY_VIOLATION);
}
