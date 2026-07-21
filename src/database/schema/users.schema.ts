// src/database/schema/users.schema.ts

import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { Role } from '@/common/enums/role.enum';

// Postgres enum — the database itself rejects any value outside this set,
// which is a stronger guarantee than validating the role in application code.
export const roleEnum = pgEnum('role', [Role.Customer, Role.Admin]);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    password: text('password').notNull(),
    phone: varchar('phone', { length: 20 }),
    avatar: text('avatar'),
    role: roleEnum('role').default(Role.Customer).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
    })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // Expression index over lower(email), same trick as brands' lower(name)
    // and coupons' upper(code): without it, "user@x.com" and "User@x.com"
    // pass the plain UNIQUE as two different values, letting someone create
    // a second account (or get locked out at login by a case mismatch) for
    // an email a human reads as identical. This single index also covers
    // lookups — no separate plain btree on email needed.
    uniqueIndex('users_email_unique').on(sql`lower(${table.email})`),
    index('users_active_idx').on(table.isActive),
    // Low-cardinality column (2 values today) — a plain index still helps
    // the admin "list users by role" query avoid a full table scan as the
    // table grows, at the cost of one extra index to maintain on writes.
    index('users_role_idx').on(table.role),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
