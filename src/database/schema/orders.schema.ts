// src/database/schema/orders.schema.ts

import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { OrderStatus } from '@/common/enums/order-status.enum';
import { products } from './products.schema';
import { users } from './users.schema';

export const orderStatusEnum = pgEnum('order_status', [
  OrderStatus.Pending,
  OrderStatus.Paid,
  OrderStatus.Processing,
  OrderStatus.Shipped,
  OrderStatus.Delivered,
  OrderStatus.Cancelled,
  OrderStatus.Refunded,
]);

interface ShippingAddressSnapshot {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Orders are a financial/audit record — restrict, not cascade, so
    // deleting a user account can't silently erase their purchase history.
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    status: orderStatusEnum('status').default(OrderStatus.Pending).notNull(),
    subtotal: numeric('subtotal', {
      precision: 10,
      scale: 2,
      mode: 'number',
    }).notNull(),
    discountAmount: numeric('discount_amount', {
      precision: 10,
      scale: 2,
      mode: 'number',
    })
      .default(0)
      .notNull(),
    couponCode: varchar('coupon_code', { length: 50 }),
    // Snapshot, not a reference: the Address row it was copied from can be
    // edited or deleted later without altering what was actually shipped to.
    shippingAddress: jsonb('shipping_address')
      .$type<ShippingAddressSnapshot>()
      .notNull(),
    total: numeric('total', {
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
    index('orders_user_id_idx').on(table.userId),
    index('orders_status_idx').on(table.status),
    check('orders_subtotal_non_negative', sql`${table.subtotal} >= 0`),
    check(
      'orders_discount_amount_non_negative',
      sql`${table.discountAmount} >= 0`,
    ),
    check('orders_total_non_negative', sql`${table.total} >= 0`),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    // Restrict: a product that's been ordered can't be hard-deleted out
    // from under its own order history — this table's snapshot columns
    // exist so the order stays meaningful even if the product later
    // changes, but the FK still has to resolve to *something*.
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    productName: varchar('product_name', { length: 200 }).notNull(),
    productSku: varchar('product_sku', { length: 64 }).notNull(),
    unitPrice: numeric('unit_price', {
      precision: 10,
      scale: 2,
      mode: 'number',
    }).notNull(),
    quantity: integer('quantity').notNull(),
    // No tax engine exists in this project — always 0 today. The column is
    // here because PRD's order-item snapshot explicitly includes tax; a
    // real implementation would populate it from a jurisdiction-aware
    // tax service at checkout time.
    taxAmount: numeric('tax_amount', {
      precision: 10,
      scale: 2,
      mode: 'number',
    })
      .default(0)
      .notNull(),
    lineTotal: numeric('line_total', {
      precision: 10,
      scale: 2,
      mode: 'number',
    }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('order_items_order_id_idx').on(table.orderId),
    check('order_items_quantity_positive', sql`${table.quantity} > 0`),
    check('order_items_unit_price_non_negative', sql`${table.unitPrice} >= 0`),
  ],
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
