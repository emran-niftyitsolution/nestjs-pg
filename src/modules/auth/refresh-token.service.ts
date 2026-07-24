// src/modules/auth/refresh-token.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateToken, hashToken } from '@/common/utils/token-hash.util';
import { PrismaService } from '@/database/prisma.service';

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
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private get ttlMs(): number {
    return (
      this.configService.get<number>('REFRESH_TOKEN_TTL_DAYS', 7) * MS_PER_DAY
    );
  }

  async issue(userId: string): Promise<IssuedToken> {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + this.ttlMs);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: hashToken(token), expiresAt },
    });

    return { token, expiresAt };
  }

  async rotate(rawToken: string): Promise<RotatedToken | null> {
    const tokenHash = hashToken(rawToken);

    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

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

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    const next = await this.issue(existing.userId);
    return { ...next, userId: existing.userId };
  }

  /** Used by /auth/logout — only revokes the token if it actually belongs to the caller. */
  async revokeOwnedByUser(rawToken: string, userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(rawToken), userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Used after a password change/reset to force re-login on every other device/session. */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
