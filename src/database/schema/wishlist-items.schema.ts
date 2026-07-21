// src/database/schema/wishlist-items.schema.ts

import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { products } from './products.schema';
import { users } from './users.schema';

export const wishlistItems = pgTable(
  'wishlist_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // A product can only be saved once per user — re-saving is a no-op,
    // not a second row (see WishlistService.add's ON CONFLICT DO NOTHING).
    uniqueIndex('wishlist_items_user_id_product_id_unique').on(
      table.userId,
      table.productId,
    ),
    index('wishlist_items_user_id_idx').on(table.userId),
  ],
);

export type WishlistItem = typeof wishlistItems.$inferSelect;
export type NewWishlistItem = typeof wishlistItems.$inferInsert;
