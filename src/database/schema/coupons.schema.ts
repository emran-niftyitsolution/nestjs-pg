// src/database/schema/coupons.schema.ts

import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  integer,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { CouponType } from '@/common/enums/coupon-type.enum';

export const couponTypeEnum = pgEnum('coupon_type', [
  CouponType.Percentage,
  CouponType.Flat,
]);

export const coupons = pgTable(
  'coupons',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: varchar('code', { length: 50 }).notNull(),
    type: couponTypeEnum('type').notNull(),
    // Percentage (0-100] or a flat currency amount, depending on `type`.
    value: numeric('value', {
      precision: 10,
      scale: 2,
      mode: 'number',
    }).notNull(),
    minPurchase: numeric('min_purchase', {
      precision: 10,
      scale: 2,
      mode: 'number',
    })
      .default(0)
      .notNull(),
    usageLimit: integer('usage_limit'),
    // Incremented by CouponsService.redeem — called from the checkout
    // transaction once an order is actually placed, not on validate().
    usageCount: integer('usage_count').default(0).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
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
    // Case-insensitive: "SAVE10" and "save10" are the same coupon, same
    // trick as Brands' lower(name) index — expression index over upper(code)
    // enforces it while still letting `WHERE upper(code) = ...` use the index.
    uniqueIndex('coupons_code_unique').on(sql`upper(${table.code})`),
    check('coupons_value_positive', sql`${table.value} > 0`),
    // A CHECK constraint referencing a sibling column: percentage coupons
    // are capped at 100, but a flat-amount coupon has no such ceiling.
    check(
      'coupons_percentage_range',
      sql`${table.type} <> 'percentage' OR ${table.value} <= 100`,
    ),
    check(
      'coupons_usage_limit_positive',
      sql`${table.usageLimit} IS NULL OR ${table.usageLimit} > 0`,
    ),
    check('coupons_min_purchase_non_negative', sql`${table.minPurchase} >= 0`),
  ],
);

export type Coupon = typeof coupons.$inferSelect;
export type NewCoupon = typeof coupons.$inferInsert;
