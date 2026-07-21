// src/database/db-transaction.type.ts

import type { DatabaseService } from './database.service';

// Derived from DatabaseService's own transaction() signature rather than
// hand-naming drizzle's internal HKT generics for PgAsyncTransaction.
export type DbTransaction = Parameters<
  DatabaseService['db']['transaction']
>[0] extends (tx: infer T) => unknown
  ? T
  : never;
