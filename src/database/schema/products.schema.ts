// src/database/schema/products.schema.ts

import { sql } from 'drizzle-orm';
import {
  check,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { ProductStatus } from '@/common/enums/product-status.enum';
import { brands } from './brands.schema';
import { categories } from './categories.schema';

export const productStatusEnum = pgEnum('product_status', [
  ProductStatus.Draft,
  ProductStatus.Active,
  ProductStatus.Archived,
]);

// Drizzle has no first-class tsvector column type — this describes the raw
// Postgres type so we can declare one via customType().
const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

interface ProductDimensions {
  length: number;
  width: number;
  height: number;
}

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 220 }).notNull(),
    description: text('description'),
    sku: varchar('sku', { length: 64 }).notNull(),
    price: numeric('price', {
      precision: 10,
      scale: 2,
      mode: 'number',
    }).notNull(),
    // Percentage off `price`, not a separate sale-price column — one fewer
    // invariant to maintain (no "discountPrice < price" check to keep true).
    discountPercentage: integer('discount_percentage'),
    stock: integer('stock').default(0).notNull(),
    weightKg: numeric('weight_kg', {
      precision: 8,
      scale: 3,
      mode: 'number',
    }),
    dimensionsCm: jsonb('dimensions_cm').$type<ProductDimensions>(),
    // Arbitrary, product-type-dependent attributes (RAM, color, material...)
    // that don't warrant their own column — the textbook JSONB use case.
    specifications: jsonb('specifications')
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    // Optional: not every product has a distinct manufacturer brand.
    // set null (not restrict) on delete — losing a brand shouldn't take
    // its products down with it, unlike a category.
    brandId: uuid('brand_id').references(() => brands.id, {
      onDelete: 'set null',
    }),
    status: productStatusEnum('status').default(ProductStatus.Draft).notNull(),
    // STORED generated column: Postgres recomputes this on every write, so
    // a GIN index on it supports full-text search without us maintaining
    // the tsvector by hand in application code.
    searchVector: tsvector('search_vector')
      .notNull()
      .generatedAlwaysAs(
        sql`to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))`,
      ),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('products_slug_unique').on(table.slug),
    uniqueIndex('products_sku_unique').on(table.sku),
    index('products_category_id_idx').on(table.categoryId),
    index('products_brand_id_idx').on(table.brandId),
    index('products_status_idx').on(table.status),
    index('products_price_idx').on(table.price),
    // GIN is the standard index type for tsvector's @@ match operator.
    index('products_search_vector_idx').using('gin', table.searchVector),
    check('products_price_non_negative', sql`${table.price} >= 0`),
    check('products_stock_non_negative', sql`${table.stock} >= 0`),
    check(
      'products_discount_percentage_range',
      sql`${table.discountPercentage} IS NULL OR (${table.discountPercentage} > 0 AND ${table.discountPercentage} <= 100)`,
    ),
  ],
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
