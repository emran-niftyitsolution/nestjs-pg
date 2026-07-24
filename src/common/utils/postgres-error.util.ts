// src/common/utils/postgres-error.util.ts

// Note: these codes only apply to errors from normal Prisma Client calls.
// $queryRaw/$executeRaw failures surface as P2010 ("raw query failed")
// instead, with the real Postgres SQLSTATE in error.meta.code.
import { Prisma } from '@/generated/prisma/client';

const UNIQUE_VIOLATION = 'P2002';
const FOREIGN_KEY_VIOLATION = 'P2003';

function hasCode(error: unknown, code: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
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
