// src/database/schema/notifications.schema.ts

import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Plain varchar, not a Postgres enum: unlike order/payment status (a
    // closed set with real branching behavior per value), notification
    // types are just labels, and new ones will keep getting added as more
    // of the app starts emitting them — that shouldn't require a migration
    // each time the way adding an enum value does.
    type: varchar('type', { length: 50 }).notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    message: text('message').notNull(),
    // Links back to whatever triggered this (e.g. { orderId }) — third
    // JSONB use in this project, and the most clear-cut one: the shape
    // genuinely varies per notification type, with no shared structure
    // worth normalizing into columns.
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('notifications_user_id_idx').on(table.userId),
    // A performance-motivated partial index, not an invariant like the
    // "one default address" / "one successful payment" ones — it only
    // covers unread rows, which is exactly the subset "how many unread /
    // list my unread" queries filter on, so the index stays small even as
    // years of read notifications pile up in the table.
    index('notifications_user_id_unread_idx')
      .on(table.userId)
      .where(sql`${table.readAt} IS NULL`),
  ],
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
