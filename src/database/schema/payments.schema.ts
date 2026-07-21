// src/database/schema/payments.schema.ts

import { sql } from 'drizzle-orm';
import {
  check,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { PaymentProvider } from '@/common/enums/payment-provider.enum';
import { PaymentStatus } from '@/common/enums/payment-status.enum';
import { orders } from './orders.schema';

export const paymentProviderEnum = pgEnum('payment_provider', [
  PaymentProvider.Cash,
  PaymentProvider.Stripe,
  PaymentProvider.Sslcommerz,
  PaymentProvider.Paypal,
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  PaymentStatus.Pending,
  PaymentStatus.Success,
  PaymentStatus.Failed,
  PaymentStatus.Refunded,
]);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Financial record — restrict, matching orders' own FK to users.
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    provider: paymentProviderEnum('provider').notNull(),
    status: paymentStatusEnum('status')
      .default(PaymentStatus.Pending)
      .notNull(),
    amount: numeric('amount', {
      precision: 10,
      scale: 2,
      mode: 'number',
    }).notNull(),
    transactionReference: varchar('transaction_reference', { length: 255 }),
    // Second JSONB column in this project (see products.specifications for
    // the first) — every provider's response has a genuinely different
    // shape (Stripe's payment_intent vs PayPal's order vs SSLCommerz's
    // validation payload), which is exactly the case JSONB is for: schemaless
    // by nature, not something we're bolting on to dodge a real schema.
    gatewayResponse: jsonb('gateway_response').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('payments_order_id_idx').on(table.orderId),
    index('payments_status_idx').on(table.status),
    // An order can accumulate multiple attempts (a failed card, a retry),
    // but never two *successful* payments — same partial-index trick as
    // "one default address per user", applied to a different invariant.
    uniqueIndex('payments_order_id_success_unique')
      .on(table.orderId)
      .where(sql`${table.status} = 'success'`),
    check('payments_amount_positive', sql`${table.amount} > 0`),
  ],
);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
