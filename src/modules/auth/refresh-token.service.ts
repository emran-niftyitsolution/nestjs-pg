// src/modules/auth/refresh-token.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, isNull } from 'drizzle-orm';
import { generateToken, hashToken } from '@/common/utils/token-hash.util';
import { DatabaseService } from '@/database/database.service';
import { refreshTokens } from '@/database/schema';

interface IssuedToken {
  token: string;
  expiresAt: Date;
}

interface RotatedToken extends IssuedToken {
  userId: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Persists refresh tokens as salted-free SHA-256 hashes and implements
 * rotation: every successful refresh issues a brand-new token and revokes
 * the one that was just used. This bounds how long a stolen token stays
 * useful to a single refresh, and a revoked token being presented again is
 * a reliable signal of theft (see the warning log in `rotate`).
 */
@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  private get ttlMs(): number {
    return (
      this.configService.get<number>('REFRESH_TOKEN_TTL_DAYS', 7) * MS_PER_DAY
    );
  }

  async issue(userId: string): Promise<IssuedToken> {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + this.ttlMs);

    await this.db.insert(refreshTokens).values({
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    });

    return { token, expiresAt };
  }

  async rotate(rawToken: string): Promise<RotatedToken | null> {
    const tokenHash = hashToken(rawToken);

    const [existing] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    if (!existing) {
      return null;
    }

    const isExpired = existing.expiresAt.getTime() < Date.now();

    if (existing.revokedAt || isExpired) {
      this.logger.warn(
        `Rejected ${existing.revokedAt ? 'revoked' : 'expired'} refresh token for user ${existing.userId}`,
      );
      return null;
    }

    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, existing.id));

    const next = await this.issue(existing.userId);
    return { ...next, userId: existing.userId };
  }

  /** Used by /auth/logout — only revokes the token if it actually belongs to the caller. */
  async revokeOwnedByUser(rawToken: string, userId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.tokenHash, hashToken(rawToken)),
          eq(refreshTokens.userId, userId),
          isNull(refreshTokens.revokedAt),
        ),
      );
  }

  /** Used after a password change/reset to force re-login on every other device/session. */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)),
      );
  }
}
