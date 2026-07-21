// src/database/schema/brands.schema.ts

import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const brands = pgTable(
  'brands',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 120 }).notNull(),
    description: text('description'),
    logoUrl: text('logo_url'),
    website: varchar('website', { length: 255 }),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('brands_slug_unique').on(table.slug),
    // Expression index over lower(name): a plain UNIQUE on `name` would still
    // let "Nike" and "nike" coexist, since Postgres compares bytes, not case.
    // Indexing the expression instead of the column enforces case-insensitive
    // uniqueness while still letting `WHERE lower(name) = ...` hit the index.
    uniqueIndex('brands_name_lower_unique').on(sql`lower(${table.name})`),
    index('brands_active_idx').on(table.isActive),
  ],
);

export type Brand = typeof brands.$inferSelect;
export type NewBrand = typeof brands.$inferInsert;
