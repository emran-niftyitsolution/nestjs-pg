// src/database/schema/dashboard-views.schema.ts

import { sql } from 'drizzle-orm';
import {
  integer,
  numeric,
  pgView,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// Orders that actually represent a completed sale, for revenue reporting —
// still-pending/cancelled orders never collected any money.
const REVENUE_STATUSES = sql`('paid', 'processing', 'shipped', 'delivered', 'refunded')`;

/**
 * A real Postgres VIEW, not a query wrapped in a service method: the
 * aggregation (SUM/GROUP BY) is stored as part of the database schema
 * itself, so any client — this API, a BI tool, a raw psql session — gets
 * the same definition of "best-selling" for free.
 */
export const bestSellingProductsView = pgView('best_selling_products_view', {
  productId: uuid('product_id').notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  slug: varchar('slug', { length: 220 }).notNull(),
  unitsSold: integer('units_sold').notNull(),
  revenue: numeric('revenue', {
    precision: 12,
    scale: 2,
    mode: 'number',
  }).notNull(),
}).as(sql`
  SELECT p.id AS product_id, p.name, p.slug,
         SUM(oi.quantity)::int AS units_sold,
         SUM(oi.line_total) AS revenue
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  JOIN products p ON p.id = oi.product_id
  WHERE o.status IN ${REVENUE_STATUSES}
  GROUP BY p.id, p.name, p.slug
`);

/**
 * Deliberately has no baked-in threshold — a view is just a stored query,
 * so "low stock" is decided by whoever selects from it (`WHERE stock <=
 * $1`), same as querying a real table. Ordered ascending so the neediest
 * products sort first even without an explicit ORDER BY downstream.
 */
export const lowStockProductsView = pgView('low_stock_products_view', {
  id: uuid('id').notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  sku: varchar('sku', { length: 64 }).notNull(),
  stock: integer('stock').notNull(),
  categoryId: uuid('category_id').notNull(),
}).as(sql`
  SELECT id, name, sku, stock, category_id
  FROM products
  WHERE status = 'active'
  ORDER BY stock ASC
`);

export const monthlySalesView = pgView('monthly_sales_view', {
  month: timestamp('month', { withTimezone: true }).notNull(),
  orderCount: integer('order_count').notNull(),
  revenue: numeric('revenue', {
    precision: 12,
    scale: 2,
    mode: 'number',
  }).notNull(),
}).as(sql`
  SELECT date_trunc('month', created_at) AS month,
         COUNT(*)::int AS order_count,
         SUM(total) AS revenue
  FROM orders
  WHERE status IN ${REVENUE_STATUSES}
  GROUP BY date_trunc('month', created_at)
`);
