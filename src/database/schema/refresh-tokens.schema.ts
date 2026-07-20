// src/database/schema/refresh-tokens.schema.ts

import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // SHA-256 hex digest of the raw token — see common/utils/token-hash.util.ts
    // for why we never persist the raw value itself.
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    // Set once the token has been rotated (used) or explicitly logged out;
    // null means "still a valid, unused session".
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // One row per token, and hash lookups on refresh/logout must be O(1).
    uniqueIndex('refresh_tokens_token_hash_unique').on(table.tokenHash),
    // Supports "revoke every session for this user" (password change/reset).
    index('refresh_tokens_user_id_idx').on(table.userId),
  ],
);

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
