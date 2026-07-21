// src/database/schema/carts.schema.ts

import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { products } from './products.schema';
import { users } from './users.schema';

export const carts = pgTable(
  'carts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // "Each user has one active cart" — enforced here, not just assumed by
    // application code that always looks up by userId.
    uniqueIndex('carts_user_id_unique').on(table.userId),
  ],
);

export const cartItems = pgTable(
  'cart_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    cartId: uuid('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    // Carts are transient, unlike orders — if a product disappears, the
    // line for it should simply disappear too, not block the delete.
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull(),
    // Price at the moment this line was last touched — not the live
    // product price, which can move independently. The cart response
    // surfaces both so the UI can flag "price changed since you added this".
    priceSnapshot: numeric('price_snapshot', {
      precision: 10,
      scale: 2,
      mode: 'number',
    }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // Composite unique constraint: a product can only appear once per cart.
    // Adding it again should increment the existing row, never insert a
    // second one — see CartsService.addItem's ON CONFLICT upsert.
    uniqueIndex('cart_items_cart_id_product_id_unique').on(
      table.cartId,
      table.productId,
    ),
    index('cart_items_cart_id_idx').on(table.cartId),
    check('cart_items_quantity_positive', sql`${table.quantity} > 0`),
  ],
);

export type Cart = typeof carts.$inferSelect;
export type NewCart = typeof carts.$inferInsert;
export type CartItem = typeof cartItems.$inferSelect;
export type NewCartItem = typeof cartItems.$inferInsert;
