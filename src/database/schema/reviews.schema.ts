// src/database/schema/reviews.schema.ts

import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { products } from './products.schema';
import { users } from './users.schema';

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Reviews are user-generated content tied to the product's own
    // lifecycle, not a financial record — cascade, unlike order_items'
    // restrict, is the right call if the product itself is ever removed.
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // One review per user per product — re-reviewing means editing the
    // existing row, not creating a second one.
    uniqueIndex('reviews_product_id_user_id_unique').on(
      table.productId,
      table.userId,
    ),
    index('reviews_product_id_idx').on(table.productId),
    check(
      'reviews_rating_range',
      sql`${table.rating} >= 1 AND ${table.rating} <= 5`,
    ),
  ],
);

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
