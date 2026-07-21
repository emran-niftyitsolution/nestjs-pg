// src/database/schema/inventory.schema.ts

import { sql } from 'drizzle-orm';
import { check, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { products } from './products.schema';

export const inventory = pgTable(
  'inventory',
  {
    // A true one-to-one: the foreign key IS the primary key, so Postgres
    // itself guarantees at most one inventory row per product — no extra
    // unique index needed, unlike the "unique index on a nullable FK"
    // pattern used for carts/addresses.
    productId: uuid('product_id')
      .primaryKey()
      .references(() => products.id, { onDelete: 'cascade' }),
    // Held for unpaid/pending orders — not yet subtracted from
    // products.stock, but not available to sell to someone else either.
    reservedStock: integer('reserved_stock').default(0).notNull(),
    // Cumulative units actually fulfilled (order reached `paid`). A running
    // counter for reporting — moving stock here also decrements
    // products.stock, so it never gets subtracted twice.
    soldStock: integer('sold_stock').default(0).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      'inventory_reserved_stock_non_negative',
      sql`${table.reservedStock} >= 0`,
    ),
    check('inventory_sold_stock_non_negative', sql`${table.soldStock} >= 0`),
  ],
);

export type Inventory = typeof inventory.$inferSelect;
export type NewInventory = typeof inventory.$inferInsert;
