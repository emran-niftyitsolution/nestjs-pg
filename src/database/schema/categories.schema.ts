// src/database/schema/categories.schema.ts

import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 120 }).notNull(),
    description: text('description'),
    // Self-reference: a category's parent is a row in this same table. The
    // callback form (rather than a direct `categories.id`) is required
    // because `categories` doesn't exist yet while this column is being
    // defined — Drizzle resolves it lazily once the table is built.
    parentId: uuid('parent_id').references((): AnyPgColumn => categories.id, {
      // Blocks deleting a category that still has children, instead of
      // silently orphaning them or cascading a delete through a whole
      // subtree — see CategoriesService.remove for the friendlier error.
      onDelete: 'restrict',
    }),
    sortOrder: integer('sort_order').default(0).notNull(),
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
    uniqueIndex('categories_slug_unique').on(table.slug),
    // Every "get direct children of X" / recursive tree query filters on
    // this column, so it needs an index as soon as the table has any depth.
    index('categories_parent_id_idx').on(table.parentId),
    index('categories_active_idx').on(table.isActive),
  ],
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
