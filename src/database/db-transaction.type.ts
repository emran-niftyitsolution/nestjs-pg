// src/database/db-transaction.type.ts

import type { PrismaService } from './prisma.service';

// Derived from PrismaService's own $transaction() signature rather than
// hand-naming Prisma's internal TransactionClient generics.
export type DbTransaction = Parameters<
  PrismaService['prisma']['$transaction']
>[0] extends (tx: infer T) => unknown
  ? T
  : never;
